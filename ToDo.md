# V1 API (https://developers.meethue.com/develop/hue-api/7-configuration-api/)
- [X] `/api`
  - [X] `POST`
- [X] `/api/config`
- [X] `/api/config/:key` (backup, internetservices, swupdate2,...)
    - [X] `GET`
- [X] `/api/:token`
    - [X] `GET`
- [X] `/api/:token/config`
    - [X] `GET`
    - [ ] `PUT`
- [ ] `/api/:token/config/whitelist/:element`
    - [ ] `DELETE`

### Capabilities (https://developers.meethue.com/develop/hue-api/10-capabilities-api/)
- [X] `/api/:token/capabilities`
    - [X] `GET`
- [X] `/api/:token/capabilities/timezones`
    - [X] `GET`

### Resourcelinks (https://developers.meethue.com/develop/hue-api/9-resourcelinks-api/)
- [X] `/api/:token/resourcelinks`
    - [ ] `GET`
    - [ ] `POST`
- [X] `/api/:token/resourcelinks/:id`
    - [ ] `GET`
    - [ ] `PUT`
    - [ ] `DELETE`

### Lights (https://developers.meethue.com/develop/hue-api/lights-api/)
- [ ] `/api/:token/lights`
  - [ ] `GET`
  - [ ] `POST`
- [ ] `/api/:token/lights/new`
- [ ] `/api/:token/lights/:id`
    - [ ] `GET`
    - [ ] `PUT`
    - [ ] `DELETE`
- [ ] `/api/:token/lights/:id/state`
    - [ ] `PUT`
- [ ] `/api/:token/lights/:id/state/:state` (bri, on, hue)

### Groups (https://developers.meethue.com/develop/hue-api/groupds-api/)
- [ ] `/api/:token/groups`
    - [ ] `GET`
    - [ ] `POST`
- [ ] `/api/:token/groups/:id`
    - [ ] `GET`
    - [ ] `PUT`
    - [ ] `DELETE`
- [ ] `/api/:token/groups/:id/action`
    - [ ] `PUT`
- [ ] `/api/:token/groups/:id/action/:action` (on,effect, hue,..)

### Schedules (https://developers.meethue.com/develop/hue-api/3-schedules-api/)
- [ ] `/api/:token/schedules`
    - [ ] `GET`
    - [ ] `POST`
- [ ] `/api/:token/schedules/:id`
    - [ ] `GET`
    - [ ] `PUT`
    - [ ] `DELETE`

### Scenes (https://developers.meethue.com/develop/hue-api/4-scenes/)
- [ ] `/api/:token/scenes`
    - [ ] `GET`
    - [ ] `POST`
- [ ] `/api/:token/scenes/appdata`
    - [ ] `GET`
- [ ] `/api/:token/scenes/:id`
    - [ ] `GET`
    - [ ] `DELETE`
- [ ] `/api/:token/scenes/:id/lightstates/:id`
    - [ ] `PUT`

### Sensors (https://developers.meethue.com/develop/hue-api/5-sensors-api/)
- [ ] `/api/:token/sensors`
    - [ ] `GET`
    - [ ] `POST`
- [ ] `/api/:token/sensors/new`
    - [ ] `GET`
- [ ] `/api/:token/sensors/:id`
    - [ ] `GET`
    - [ ] `PUT`
    - [ ] `DELETE`
- [ ] `/api/:token/sensors/:id/config`
    - [ ] `PUT`
- [ ] `/api/:token/sensors/:id/state`
    - [ ] `PUT`

### Rules (https://developers.meethue.com/develop/hue-api/6-rules-api/)
- [ ] `/api/:token/rules`
    - [ ] `GET`
    - [ ] `POST`
- [ ] `/api/:token/rules/:id`
    - [ ] `GET`
    - [ ] `PUT`
    - [ ] `DELETE`

# V2 API


# Versions
- https://developers.meethue.com/develop/hue-api/api-documentation-changelog/