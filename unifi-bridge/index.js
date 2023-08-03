const express = require('express')
const mqtt = require('mqtt');
const Unifi = require('node-unifi')

function must_have_env(variable, name) {
	if (variable == null || variable.trim().length == 0) {
		console.log(`You must set ${name} in the addon config`)
		process.exit(22)
	}
	return variable
}

unifi_config = {
	username : must_have_env(process.env.UNIFI_USERNAME, 'unifi_username'),
	password : must_have_env(process.env.UNIFI_PASSWORD, 'unifi_password'),
	site : must_have_env(process.env.UNIFI_SITE, 'unifi_site'),
	host : must_have_env(process.env.UNIFI_HOST, 'unifi_host'),
	port : must_have_env(process.env.UNIFI_PORT, 'unifi_port')
}

mqtt_config = {
	username : must_have_env(process.env.MQTT_USERNAME, 'mqtt_username'),
	password : must_have_env(process.env.MQTT_PASSWORD, 'mqtt_password'),
	endpoint : must_have_env(process.env.MQTT_ENDPOINT, 'mqtt_endpoint'),
	topic_base : 'unifi-bridge'
}

console.log('Initializing mqtt connection')
const mqtt_client = mqtt.connect(mqtt_config.endpoint)

mqtt_client.on('connect', () => {
	console.log('Mqtt connection established')
});

console.log('Initializing webservice')
const webservice = express()

class ExtendedUnifiController extends Unifi.Controller {
  enableFirewallRule(ruleSet, ruleIndex) {
    return this.setFirewallRuleEnabled(ruleSet, ruleIndex, true)
  }

  disableFirewallRule(ruleSet, ruleIndex) {
    return this.setFirewallRuleEnabled(ruleSet, ruleIndex, false)
  }

  toggleFirewallRule(ruleSet, ruleIndex) {
    return this.setFirewallRuleEnabled(ruleSet, ruleIndex, null)
  }

  async setFirewallRuleEnabled(ruleSet, ruleIndex, enabled) {
    const rule = await this.getFirewallRule(ruleSet, ruleIndex)
    if (rule == null)
		return null
	
	if (enabled == null)
    	rule.enabled = !rule.enabled
	else
		rule.enabled = enabled
    return await this.editFirewallRule(rule)
  }

  async getFirewallRule(ruleSet, ruleIndex) {
    const firewallRules = await this.getFirewallRules()
    const rule = firewallRules.find(rule => rule.ruleset == ruleSet && rule.rule_index == ruleIndex)
	return rule
}

  async editFirewallRule(rule) {
    const rules = await this._request('/api/s/<SITE>/rest/firewallrule/' + rule._id, rule, 'PUT');
	if (rules.length > 0) {
		return rules[0]
	} else {
		return null
	}
  }
}


const unifi = new ExtendedUnifiController({host: unifi_config.host, port: unifi_config.port, sslverify: false, timeout: 30000});

webservice.get('/firewall_rule/:rule_set/:rule_id', async (req, res) => {
	var rule_set = req.params['rule_set'] 
	var rule_id = req.params['rule_id'] 

	firewall_rule = await unifi.getFirewallRule(rule_set, rule_id)
	if (firewall_rule == null) {
		res.status(404).end()
	} else {
		res.json(firewall_rule).end()
	}
})

webservice.get('/client_devices', async (req, res) => {
	client_devices = await unifi.getClientDevices()
	if (client_devices == null) {
		res.status(404).end()
	} else {
		res.json(client_devices).end()
	}
})

webservice.post('/firewall_rule/:rule_set/:rule_id/toggle', express.json(), async (req, res) => {
	var rule_set = req.params['rule_set'] 
	var rule_id = req.params['rule_id'] 

	firewall_rule = await unifi.toggleFirewallRule(rule_set, rule_id)
	if (firewall_rule == null) {
		res.status(404).end()
	}
	else {
		mqtt_client.publish(`${mqtt_config.topic_base}/${unifi_config.site}/firewall_rule/${rule_set}/${rule_id}/enabled`, JSON.stringify(firewall_rule.enabled));
		res.json(firewall_rule).end()
	}	
})

console.log(`Starting listener on port 8000`)
webservice.listen(8000, async () => {
	console.log('running version 1.0.13')
	await unifi.login(unifi_config.username, unifi_config.password);
	console.log(`Unifi Bridge is running on port ${unifi_config.port}`);
})
