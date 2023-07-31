# hassio-unifi-bridge

1) In Home Assistant go to `Supervisor` > `Add-on Store` > dots top-right > `Repositories` and add the repository URL `https://github.com/helmut-hoffer-von-ankershoffen/hassio-ring-bridge`.
2) Click on `Unifi Bridge` > `INSTALL` > Wait for a few min, as Docker container with NodeJS webservice is built locally.
3) Click on `START` after enabling `Watchdog` and optionally `Auto update`. Click on `LOGS` and `REFRESH` to see everything is working as expected.

## Sensor

Add the following to `configuration.yaml` of Home Assistant and restart:

```yaml
sensor:
  - platform: rest
    name: ring_location_mode
    resource: http://127.0.0.1:8000/location-mode
    value_template: '{{ value_json.mode }}'
```

For lovelace

```yaml
type: entities
entities:
  - entity: sensor.ring_location_mode
    name: Ring Modus
    icon: 'hass:shield'
```

## Service

Add the following to `configuration.yaml` of Home Assistant and restart:

```yaml
rest_command:
  ring_location_mode:
    url: http://127.0.1:8000/location-mode
    method: POST
    payload: '{"mode": "{{ mode }}"}'
    content_type:  'application/json; charset=utf-8'
```