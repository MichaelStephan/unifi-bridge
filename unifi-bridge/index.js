const express = require('express')
const mqtt = require('mqtt');
const Unifi = require('node-unifi')

const DEFAULT_LISTEN_REFRESH_INTERVAL = 1000 * 5

function must_have_env(variable, name) {
	if (variable == null || `${variable}`.trim().length == 0) {
		console.log(`You must set ${name} in the addon config`)
		process.exit(22)
	}
	return variable
}

const unifi_config = {
	username : must_have_env(process.env.UNIFI_USERNAME, 'unifi_username'),
	password : must_have_env(process.env.UNIFI_PASSWORD, 'unifi_password'),
	site : must_have_env(process.env.UNIFI_SITE, 'unifi_site'),
	host : must_have_env(process.env.UNIFI_HOST, 'unifi_host'),
	port : must_have_env(process.env.UNIFI_PORT, 'unifi_port')
}

const mqtt_config = {
	username : must_have_env(process.env.MQTT_USERNAME, 'mqtt_username'),
	password : must_have_env(process.env.MQTT_PASSWORD, 'mqtt_password'),
	endpoint : must_have_env(process.env.MQTT_ENDPOINT, 'mqtt_endpoint'),
	topic_base : 'unifi-bridge'
}

const config = {
	listeners : JSON.parse(must_have_env(process.env.LISTENERS, 'listeners')),
}

console.log('Initializing mqtt connection')
const mqtt_client = mqtt.connect(mqtt_config.endpoint, {username: mqtt_config.username, password: mqtt_config.password})

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
		mqtt_client.publish(`${mqtt_config.topic_base}/${unifi_config.site}/firewall_rule/${rule_set}/${rule_id}`, JSON.stringify(firewall_rule), {retain: true});
		res.json(firewall_rule).end()
	}	
})

function matches(document, template) {
	const template_keys = Object.keys(template)

	let match = true
	for (k in template_keys) {
		key = template_keys[k]
		match = match && (`${document[key]}` == `${template[key]}`)
	}

	return match
}

client_devices_timeoutIds = {} 

async function informListeners() {
	firewall_rules = await unifi.getFirewallRules()
	for (i in firewall_rules) {
		const firewall_rule = firewall_rules[i]
		for (j in config.listeners) {
			listener = config.listeners[j]
			if (listener.type == 'firewall_rule' && matches(firewall_rule, listener.filter)) {
				mqtt_client.publish(`${mqtt_config.topic_base}/${unifi_config.site}/firewall_rule/${firewall_rule.ruleset}/${firewall_rule.rule_index}`, JSON.stringify(firewall_rule), {retain: true})
			}
		}
	}

	client_devices = await unifi.getClientDevices()
	for (i in client_devices) {
		const client_device = client_devices[i]
		for (j in config.listeners) {
			listener = config.listeners[j]
			if (listener.type == 'client_device' && matches(client_device, listener.filter)) {
				topic = `${mqtt_config.topic_base}/${unifi_config.site}/client_device/${client_device.mac}`
				availableTopic = `${topic}/available`
				mqtt_client.publish(topic, JSON.stringify(client_device));
				mqtt_client.publish(availableTopic, 'online');	

				if (client_devices_timeoutIds[topic] == null) {
					client_devices_timeoutIds[topic] = setTimeout(() => {
						mqtt_client.publish(availableTopic, 'offline', {retain: true});
						delete client_devices_timeoutIds[topic]
					}, 3 * DEFAULT_LISTEN_REFRESH_INTERVAL)
				} else {
					clearTimeout(client_devices_timeoutIds[topic])
					delete client_devices_timeoutIds[topic]
				}
			}
		}
	}
}

console.log(`Starting listener on port 8000`)
webservice.listen(8000, async () => {
	await unifi.login(unifi_config.username, unifi_config.password);
	console.log(`Unifi Bridge is running on port ${unifi_config.port}`);
	
	informListeners()
	setInterval(informListeners, DEFAULT_LISTEN_REFRESH_INTERVAL)
})
