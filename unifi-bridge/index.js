const express = require("express")
const Unifi = require('node-unifi');

console.log('Initializing webservice.')
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
    return this._request('/api/s/<SITE>/rest/firewallrule/' + rule._id, rule, 'PUT');
  }
}

var username = process.env.USERNAME
if (username == undefined) {
	console.log("You must set an user in the addon config")
	process.exit(22)
}

var password = process.env.PASSWORD
if (password == undefined) {
	console.log("You must set a password in the addon config")
	process.exit(22)
}

var site = process.env.SITE
if (site == undefined) {
	console.log("You must set a site in the addon config")
	process.exit(22)
}

var host = process.env.HOST
if (host == undefined) {
	console.log("You must set an host in the addon config")
	process.exit(22)
}

var port = process.env.PORT
if (port == undefined) {
	console.log("You must set a port in the addon config")
	process.exit(22)
}

const unifi = new ExtendedUnifiController({host, port, sslverify: false});

webservice.get('/firewall_rule/:rule_set/:rule_id', async (req, res) => {
	var rule_set = req.params['rule_set'] 
	var rule_id = req.params['rule_id'] 

	firewall_rule = await unifi.getFirewallRule(rule_set, rule_id)
	if (firewall_rule == null) {
		res.status(404)
		res.end()
	} else {
		res.json(firewall_rule)
	}
})

webservice.get('/client_devices', async (req, res) => {
	client_devices = await unifi.getClientDevices()
	if (client_devices == null) {
		res.status(404)
		res.end()
	} else {
		res.json(client_devices)
	}
})

webservice.post('/firewall_rule/:rule_set/:rule_id/toggle', express.json(), async (req, res) => {
	var rule_set = req.params['rule_set'] 
	var rule_id = req.params['rule_id'] 

	firewall_rule = await unifi.toggleFirewallRule(rule_set, rule_id)
	if (firewall_rule == null) {
		res.status(404)
		res.end()
	}
	else {
		res.json(firewall_rule)
	}	
})

console.log(`Starting listener on port ${port}.`)
webservice.listen(8000, async () => {
	console.log('running version 1.0.11')
	await unifi.login(username, password);
	console.log(`Unifi Bridge is running on port ${port}.`);
})
