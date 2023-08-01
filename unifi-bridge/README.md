# hassio-unifi-bridge

1) In Home Assistant go to `Supervisor` > `Add-on Store` > dots top-right > `Repositories` and add the repository URL `https://github.com/MichaelStephan/unifi-bridge`.
2) Click on `Unifi Bridge` > `INSTALL` > Wait for a few min, as Docker container with NodeJS webservice is built locally.
3) Click on `START` after enabling `Watchdog` and optionally `Auto update`. Click on `LOGS` and `REFRESH` to see everything is working as expected.

## Sensor

Add the following to `configuration.yaml` of Home Assistant and restart:

```yaml
sensor:
    - platform: rest
      name: drop_video_traffic
      resource: http://127.0.0.1:8000/firewall_rule/WAN_OUT/2001
      value_template: '{{ value_json.enabled }}'
```

## Service

Add the following to `configuration.yaml` of Home Assistant and restart:

```yaml
rest_command:
  drop_video_traffic_toggle:
    url: http://127.0.0.1:8000/firewall_rule/WAN_OUT/2001/toggle
    method: POST
```