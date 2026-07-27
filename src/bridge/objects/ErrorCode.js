/**
 * virthue - Virtual Philips Hue Bridge
 * Bridge Objects - Data structures and schemas
 *
 * @author      Adrian Preuß
 * @version     1.0.0
 */

/**
 * Error Code Constants - Maps error identifiers to numeric codes
 *
 * @swagger
 * @schema ErrorCode
 * @enum
 */
export default {
    /* Generic Errors (1-99) */
    /**
     * @value 1 UNAUTHORIZED_USER This will be returned if an invalid username is used in the request, or if the username does not have the rights to modify the resource.
     */
    UNAUTHORIZED_USER: 1,
    /**
     * @value 2 INVALID_JSON This will be returned if the body of the message contains invalid JSON.
     */
    INVALID_JSON: 2,
    /**
     * @value 3 RESOURCE_NOT_FOUND This will be returned if the addressed resource does not exist. E.g. the user specifies a light ID that does not exist.
     */
    RESOURCE_NOT_FOUND: 3,
    /**
     * @value 4 METHOD_NOT_SUPPORTED This will be returned if the method (GET/POST/PUT/DELETE) used is not supported by the URL e.g. DELETE is not supported on the /config resource.
     */
    METHOD_NOT_SUPPORTED: 4,
    /**
     * @value 5 MISSING_MANDATORY_PARAMETER Will be returned if required parameters are not present in the message body. The presence of invalid parameters should not trigger this error as long as all required parameters are present.
     */
    MISSING_MANDATORY_PARAMETER: 5,
    /**
     * @value 6 PARAMETER_NOT_FOUND This will be returned if a parameter sent in the message body does not exist. This error is specific to PUT commands; invalid parameters in other commands are simply ignored.
     */
    PARAMETER_NOT_FOUND: 6,
    /**
     * @value 7 INVALID_PARAMETER_VALUE This will be returned if the value set for a parameter is of the incorrect format or is out of range.
     */
    INVALID_PARAMETER_VALUE: 7,
    /**
     * @value 8 READ_ONLY_PARAMETER This will be returned if an attempt to modify a read only parameter is made.
     */
    READ_ONLY_PARAMETER: 8,
    /**
     * @value 11 TOO_MANY_ITEMS_IN_LIST List in request contains too many items.
     */
    TOO_MANY_ITEMS_IN_LIST: 11,
    /**
     * @value 12 BRIDGE_NOT_CONNECTED_TO_PORTAL Command requires portal connection. Returned if portalservices is "false" or the portal connection is down.
     */
    BRIDGE_NOT_CONNECTED_TO_PORTAL: 12,

    /* Command Specific Errors (100-899) */
    /**
     * @value 101 LINK_BUTTON_NOT_PRESSED /config/linkbutton is false. Link button has not been pressed in last 30 seconds.
     */
    LINK_BUTTON_NOT_PRESSED: 101,
    /**
     * @value 110 CANNOT_DISABLE_DHCP DHCP can only be disabled if there is a valid static IP configuration.
     */
    CANNOT_DISABLE_DHCP: 110,
    /**
     * @value 111 INVALID_SOFTWARE_UPDATE_STATE checkforupdate can only be set in updatestate 0 and 1.
     */
    INVALID_SOFTWARE_UPDATE_STATE: 111,

    /* Light State / Parameter Modifiability */
    /**
     * @value 201 PARAMETER_NOT_MODIFIABLE_DEVICE_OFF This will be returned if a user attempts to modify a parameter which cannot be modified due to current state of the device. This will most commonly be returned if the api/sat/bri/effect/xy/ct parameters are modified while the on parameter is false.
     */
    PARAMETER_NOT_MODIFIABLE_DEVICE_OFF: 201,
    /**
     * @value 203 COMMISSIONABLE_LIGHT_LIST_FULL No more space left to commission a new ZigBee light.
     */
    COMMISSIONABLE_LIGHT_LIST_FULL: 203,

    /* Group / Resource Full */
    /**
     * @value 301 GROUP_TABLE_FULL The bridge can store a maximum of 64 groups. This error will be returned if there are already the maximum number of groups created in the bridge.
     */
    GROUP_TABLE_FULL: 301,
    /**
     * @value 305 NOT_ALLOWED_TO_UPDATE_OR_DELETE_GROUP_TYPE This will be returned if an attempt to update a light list in a group or delete a group of type "Luminaire" or "LightSource"
     */
    NOT_ALLOWED_TO_UPDATE_OR_DELETE_GROUP_TYPE: 305,
    /**
     * @value 306 LIGHT_ALREADY_USED_IN_ANOTHER_ROOM A light can only be used in 1 room at the same time. Note: Added in 1.11
     */
    LIGHT_ALREADY_USED_IN_ANOTHER_ROOM: 306,

    /* Scene Errors */
    /**
     * @value 402 SCENE_BUFFER_FULL It is not possibly anymore to buffer scenes in the bridge for the lights. Application can try again later, let the user turn on lights, remove schedules or delete scenes.
     */
    SCENE_BUFFER_FULL: 402,
    /**
     * @value 403 SCENE_IS_LOCKED Scene could not be removed, because it's locked. Delete the resource (schedule or rule action) that is locking it first.
     */
    SCENE_IS_LOCKED: 403,
    /**
     * @value 404 SCENE_GROUP_IS_EMPTY Scene could not be created, group is empty.
     */
    SCENE_GROUP_IS_EMPTY: 404,

    /* Sensor Errors */
    /**
     * @value 501 NOT_ALLOWED_TO_CREATE_SENSOR_TYPE Will be returned if the sensor type cannot be created using CLIP.
     */
    NOT_ALLOWED_TO_CREATE_SENSOR_TYPE: 501,
    /**
     * @value 502 SENSOR_LIST_FULL This will be returned if there are already the maximum number of sensors created in the bridge.
     */
    SENSOR_LIST_FULL: 502,
    /**
     * @value 503 COMMISSIONABLE_SENSOR_LIST_FULL No more space left to commission a new ZigBee sensor. See also /capabilities/sensors.
     */
    COMMISSIONABLE_SENSOR_LIST_FULL: 503,

    /* Rule Errors */
    /**
     * @value 601 RULE_ENGINE_FULL Returned when already 100 rules are created and no further rules can be added.
     */
    RULE_ENGINE_FULL: 601,
    /**
     * @value 607 RULE_CONDITION_ERROR Rule conditions contain errors or operator combination is not allowed (e.g. only one dt operator is allowed).
     */
    RULE_CONDITION_ERROR: 607,
    /**
     * @value 608 RULE_ACTION_ERROR Rule actions contain errors or multiple actions with the same resource address.
     */
    RULE_ACTION_ERROR: 608,
    /**
     * @value 609 UNABLE_TO_ACTIVATE_RULE Unable to set rule status to 'enable, because rule conditions references unknown resource or unsupported resource attribute.
     */
    UNABLE_TO_ACTIVATE_RULE: 609,

    /* Schedule Errors */
    /**
     * @value 701 SCHEDULE_LIST_FULL This will be returned if there are already the maximum number of schedules created in the bridge.
     */
    SCHEDULE_LIST_FULL: 701,
    /**
     * @value 702 SCHEDULE_TIMEZONE_NOT_VALID Cannot set parameter 'localtime', because timezone has not been configured.
     */
    SCHEDULE_TIMEZONE_NOT_VALID: 702,
    /**
     * @value 703 SCHEDULE_CANNOT_SET_TIME_AND_LOCALTIME Cannot set parameter 'time' and 'localtime' at the same time.
     */
    SCHEDULE_CANNOT_SET_TIME_AND_LOCALTIME: 703,
    /**
     * @value 704 SCHEDULE_INVALID_TAG Cannot create schedule because tag, <tag>, is invalid.
     */
    SCHEDULE_INVALID_TAG: 704,
    /**
     * @value 705 SCHEDULE_TIME_IN_THE_PAST The schedule has expired , the time pattern has to be updated before enabling.
     */
    SCHEDULE_TIME_IN_THE_PAST: 705,
    /**
     * @value 706 SCHEDULE_COMMAND_ERROR Schedule command on a unsupported resource.
     */
    SCHEDULE_COMMAND_ERROR: 706,

    /* Backup/Configuration Errors */
    /**
     * @value 801 SOURCE_MODEL_INVALID Backup is requested on an unsupported bridge model.
     */
    SOURCE_MODEL_INVALID: 801,
    /**
     * @value 802 SOURCE_FACTORY_NEW Backup is requested on a factory new bridge, nothing to backup.
     */
    SOURCE_FACTORY_NEW: 802,
    /**
     * @value 803 INVALID_STATE Backup is requested in another state then idle.
     */
    INVALID_STATE: 803,

    /* Internal Errors (900+) */
    /**
     * @value 901 INTERNAL_BRIDGE_ERROR This will be returned if there is an internal error in the processing of the command. This indicates an error in the bridge, not in the message being sent.
     */
    INTERNAL_BRIDGE_ERROR: 901,

    /**
     * @value -1 UNKNOWN_ERROR An unknown error was encountered.
     */
    UNKNOWN_ERROR: -1,
};
