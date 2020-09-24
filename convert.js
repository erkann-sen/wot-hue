const args = process.argv;
let ipOfHueBridge = args[2];
let userName = args[3];

const request = require("request")
const fs = require('fs');
var beautify = require('js-beautify');

//url
if (ipOfHueBridge == undefined) {
    ipOfHueBridge = 'http://<your bridge ip adress>'
}
if (ipOfHueBridge.substr(ipOfHueBridge.length - 1) == '/') {
    ipOfHueBridge = ipOfHueBridge.slice(0, -1);
}

if (userName == undefined) {
    userName = '<bridge user name>'
}

let path = ipOfHueBridge + '/api/' + userName;

var options = {
    url: path,
    method: 'GET',
    json: true
}

request(options, function (error, response, body) {
    if (!error && response.statusCode === 200) {
        createTDFrom(body)
    }
})

function createTDFrom(content) {
    var newCode = new Object();
    addBasics(newCode);
    var lights = content.lights;
    addLights(lights, newCode);
    var sensors = content.sensors;
    addSensors(sensors, newCode);
    console.log(JSON.stringify(newCode));
    beautifiedCode = beautify(JSON.stringify(newCode), { indent_size: 4, space_in_empty_paren: true });
    
    fs.writeFile("hueBridgeTD.json", beautifiedCode, (err) => {
        if (err) { console.log(err); }
    });
}

function addSensors(sensors, to) {
    for (const key in sensors) {
        let id = key;
        let sensor = sensors[key];
        if (sensor.type == "CLIPGenericStatus") {
            // not important values trim down
            return;
        }

        addSensorWithIdIn(sensor,id,to);

        //create extra TD for sensor
        var sensorJson = new Object();
        addBasics(sensorJson);
        sensorJson["title"] = sensor.name;
        addSensorWithIdIn(sensor,id,sensorJson);
        beautifiedCode = beautify(JSON.stringify(sensorJson), { indent_size: 4, space_in_empty_paren: true });
        
        //create folder if not exist
        var dir = './sensor TDs';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        fs.writeFile("sensor TDs/" +sensor.name + ".json", beautifiedCode, (err) => {
            if (err) { console.log(err); }
        });
    }
}

function addSensorWithIdIn(sensor,id,to) {
    var link = path + "/sensors/" + id;
    var name = sensor.name.split(' ').join('_')

    propertiesObj = to["properties"];   
    propertiesObj[name] = {};
    sensorPropertyObject = propertiesObj[name];
    sensorPropertyObject["title"] = "Properties of " + sensor.name;
    sensorPropertyObject["description"] = "Get state of " + sensor.type;
    sensorPropertyObject["type"] = "object";
    sensorPropertyObject["readOnly"] = true;
    sensorPropertyObject["writeOnly"] = false;
    sensorPropertyObject["properties"] = {};
    sensorPropertyObject["properties"]["state"] = createSensorStateFromStateObject(sensor.state);
    addOtherPropertyObjectsOfSensor(sensor, sensorPropertyObject["properties"])
    sensorPropertyObject["forms"] = [{
        "href": link,
        "contentType": "application/json",
        "op": [
            "readproperty"
        ]
    }]

    //actions
    actionsObj = to["actions"];
    addChangeConfigActionOfSensor(name, actionsObj,link);
}

function addChangeConfigActionOfSensor(name, actionsObj,link) {
    var actName = "change_config_of_" + name;
    configLink = link + "/config"
    var actionObj;
    
    actionsObj[actName]={};
    actionObj = actionsObj[actName];
    actionObj["description"] = "On/Off state of the light. On=true, Off=false";
    actionObj["input"] = {};
    actionObj["input"]["type"] = "object";
    actionObj["input"]["properties"] = {
        "on": {
            "type": "boolean"
        }
    };
    addFormTo(actionObj,configLink);
}

function addOtherPropertyObjectsOfSensor(sensor, to) {
    for (const key in sensor) {
        if(key == "state") {
            continue;
        }
        to[key] = {};
        setTypeOfPropertyAndDescriptionOfSensorProperty(key,sensor[key],to[key])
    }
}

function setTypeOfPropertyAndDescriptionOfSensorProperty(key,value,to) {
    to["type"] = "string";
    if (key == "type") {
        to["description"] = "Type name of the sensor";
    } else  if (key == "name") {
        to["description"] = "The human readable name of the sensor, can be changed by the user.";
    } else  if (key == "modelid") {
        to["description"] = "This parameter uniquely identifies the hardware model of the device for the given manufaturer.";
    } else  if (key == "uniqueid") {
        to["description"] = "Unique id of the sensor. Should be the MAC address of the device.";
    } else  if (key == "manufacturername") {
        to["description"] = "The name of the device manufacturer.";
    } else  if (key == "swversion") {
        to["description"] = "This parameter uniquely identifies the software version running in the hardware.";
    } else  if (key == "recycle") {
        to["description"] = "When true: Resource is automatically deleted when not referenced anymore in any resource link. Only for CLIP sensors on creation of resource. “false” when omitted.";
        to["type"] = "boolean";
    } else  if (key == "config") {
        to["description"] = "The configuration object with attributes corresponding to the sensor type. Attribute values represents configuration information.";
        to["type"] = "object";
        to["properties"] = {
            "on": {
                "type": "boolean", 
                "description": "Turns the sensor on/off. When off, state changes of the sensor are not reflected in the sensor resource."
            },
            "reachable":{
                "type": "boolean", 
                "description": "Indicates whether communication with devices is possible. CLIP Sensors do not yet support reachable verification. Mandatory for all Sensors except ZGPSwitch, Daylight"
            },
            "battery":{
                "type": "integer", 
                "description": "The current battery state in percent, only for battery powered devices. Not present when not provided on creation (CLIP sensors)."
            }}
    } else {
        to["type"] = typeof value;
    }
}

function createSensorStateFromStateObject(state) {
    var stateObj = {};
    stateObj["type"] = "object";
    stateObj["properties"] = {};
    var stateProperties = stateObj["properties"];
    for (const key in state) {
        stateProperties[key] = {};
        setTypeOfPropertyAndDescriptionOfSensor(key,stateProperties[key])
    }
    return stateObj;
}

function setTypeOfPropertyAndDescriptionOfSensor(key,to) {
    if(key == "lastupdated") {
        to["type"] = "string";
        to["format"] = "date-time";
        to["description"] = "Last update date of the sensor";
    } else if (key == "daylight") {
        to["type"] = "boolean";
        to["description"] = "Indicates if sensor gets daylight";
    } else if (key == "dark") {
        to["type"] = "boolean";
        to["description"] = "Indicates if sensor is in dark";
    } else if (key == "presence") {
        to["type"] = "boolean";
        to["description"] = "Indicates if presence sensor is triggered";
    } else if (key == "lightlevel") {
        to["type"] = "integer";
        to["description"] = "Light level that sensed by sensor";
        to["minimum"] = 0;
        to["maximum"] = 65535;
    } else if (key == "temperature") {
        to["type"] = "integer";
        to["description"] = "Outside temperature in Celcius * 100";
    } else if (key == "buttonevent") {
        to["type"] = "integer";
        to["description"] = "The last event done by the switch. ***2 means short release, ***3 means long release. 1* is the turn on button, 2* is the brighten button, 3* is the dim button, 4* is the turn off button";
        to["enum"] = [1002,1003,2002,2003,3002,3003,4002,4003]
    } else if (key == "status") {
            to["description"] = "The Hue CLIP Sensor saves scene states with status or flag for HUE rules.";
            to["type"] = "integer";
    }
}

function addLights(lights, to) {
    for (const key in lights) {
        let id = key;
        let light = lights[key];
        addLightWithIdIn(light,id,to);

        //create extra TD for light
        var lightJson = new Object();
        addBasics(lightJson);
        lightJson["title"] = light.name;
        addLightWithIdIn(light,id,lightJson);
        beautifiedCode = beautify(JSON.stringify(lightJson), { indent_size: 4, space_in_empty_paren: true });
         
        //create folder if not exist
         var dir = './light TDs';
         if (!fs.existsSync(dir)){
             fs.mkdirSync(dir);
         }
        fs.writeFile("light TDs/" + light.name + ".json", beautifiedCode, (err) => {
            if (err) { console.log(err); }
        });
    }
}

function addLightWithIdIn(light,id,to) {

    var link = path + "/lights/" + id;

    //properties
    propertiesObj = to["properties"];
    var name = light.name.split(' ').join('_')
    propertiesObj[name] = {};
    lightPropertyObject = propertiesObj[name];
    lightPropertyObject["title"] = "Properties of " + light.name;
    lightPropertyObject["description"] = "Get state of " + light.type;
    lightPropertyObject["type"] = "object";
    lightPropertyObject["readOnly"] = true;
    lightPropertyObject["writeOnly"] = false;
    lightPropertyObject["properties"] = {};
    lightPropertyObject["properties"]["state"] = createStateFromStateObject(light.state);
    addOtherPropertyObjectsOfLight(light, lightPropertyObject["properties"])
    lightPropertyObject["forms"] = [{
        "href": link,
        "contentType": "application/json",
        "op": [
            "readproperty"
        ]
    }]

    //actions
    actionsObj = to["actions"];
    link = link + "/state"
    addActionObjectsOfLight(name,light.state, actionsObj,link);
}

function addActionObjectsOfLight(name,light, actionsObj,link){
    for (const key in light) {
        addActionObjectOfLight(name,key,actionsObj,link);
    }
}
function addFormTo(obj,link){
    var form = {};
    form["href"] = link;
    form["contentType"] = "application/json";
    form["htv:methodName"] = "PUT";
    form["op"] = ["invokeaction"];
    obj["forms"] = [form];
}


function addActionObjectOfLight(name,key,actionsObj,link) {
    var actName = "set_" + key + "_of_" + name;
    var actionObj;
    if(key == "on") {
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "On/Off state of the light. On=true, Off=false";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "on": {
                "type": "boolean"
            }
        };
    } else if (key == "bri") {
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "Brightness level of the light.";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "bri": {
                "type": "integer",
                "minimum" : 1,
                "maximum" : 254
            }
        }
        addFormTo(actionObj,link);
        //bri_inc
        actName = "increase_" + key + "_of_" + name;
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "Increases or decreases brightness level of the light.";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "bri_inc": {
                "type": "integer",
                "minimum" : -254,
                "maximum" : 254
            }
        }

    } else if (key == "hue") {
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "Hue value of the light";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "hue": {
                "type": "integer",
                "minimum" : 0,
                "maximum" : 65535
            }
        }
        addFormTo(actionObj,link);
        //hue_inc
        actName = "increase_" + key + "_of_" + name;
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "Increases or decreases hue value of the light.";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "hue_inc": {
                "type": "integer",
                "minimum" : -65534,
                "maximum" : 65534 
            }
        }
    } else if (key == "sat") {
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "Saturation of the light. 254 is the most saturated (colored) and 0 is the least saturated (white)";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "sat": {
                "type": "integer",
                "minimum" : 0,
                "maximum" : 254
            }
        }
        addFormTo(actionObj,link);
        //sat_inc
        actName = "increase_" + key + "_of_" + name;
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "Increases or decreases saturation level of the light.";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "sat_inc": {
                "type": "integer",
                "minimum" : -254,
                "maximum" : 254
            }
        }
    } else if (key == "ct") {
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "The Mired Color temperature of the light.";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "ct": {
                "type": "integer",
                "minimum" : 153,
                "maximum" : 500
            }
        }
        addFormTo(actionObj,link);
        //ct_inc
        actName = "increase_" + key + "_of_" + name;
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "Increases or decreases the Mired Color temperature of the light.";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "ct_inc": {
                "type": "integer",
                "minimum" : -65534 ,
                "maximum" : 65534 
            }
        }
    } else if (key == "alert") {
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "The alert effect, which is a temporary change to the bulb’s state.'l' of lselect stands for loop.";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "alert": {
                "type": "string",
                "enum" : ["none","select","lselect"]
            }
        }
    } else if (key == "xy") {
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "The x and y coordinates of a color in CIE color space.";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "xy": {
                "type": "array",
                "items" : [{"type": "float","description": "X coordinate"},{"type": "float","description": "Y coordinate"}]
            }
        }
        addFormTo(actionObj,link);
        //xy_inc
        actName = "increase_" + key + "_of_" + name;
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "Increases or decreases the x and y coordinates of a color in CIE color space.";
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "xy_inc": {
                "type": "array",
                "items" : [{"type": "float","description": "X coordinate"},{"type": "float","description": "Y coordinate"}]
            }
        }
    } else if (key == "effect") {
        actionsObj[actName]={};
        actionObj = actionsObj[actName];
        actionObj["description"] = "The dynamic effect of the light, can either be “none” or “colorloop”.If set to colorloop, the light will cycle through all hues using the current brightness and saturation settings.",
        actionObj["input"] = {};
        actionObj["input"]["type"] = "object";
        actionObj["input"]["properties"] = {
            "effect": {
                "type": "string",
                "enum" : ["none","colorloop"]
            }
        }
    }
    if(actionObj != undefined) {
        addFormTo(actionObj,link);
    }
}

function addOtherPropertyObjectsOfLight(light, to) {
    for (const key in light) {
        if(key == "state") {
            continue;
        }
        to[key] = {};
        setTypeOfPropertyAndDescriptionOfLightProperty(key,light[key],to[key])
    }
}
function setTypeOfPropertyAndDescriptionOfLightProperty(key,value,to) {
    to["type"] = typeof value;
    if (key == "type") {
        to["description"] = "A fixed name describing the type of light e.g. “Extended color light”";
    } else  if (key == "name") {
        to["description"] = "A unique, editable name given to the light.";
    } else  if (key == "modelid") {
        to["description"] = "The hardware model of the light.";
    } else  if (key == "uniqueid") {
        to["description"] = "Unique id of the device. The MAC address of the device with a unique endpoint id in the form: AA:BB:CC:DD:EE:FF:00:11-XX";
    } else  if (key == "manufacturername") {
        to["description"] = "The manufacturer name.";
    } else  if (key == "luminaireuniqueid") {
        to["description"] = "Unique ID of the luminaire the light is a part of in the format: AA:BB:CC:DD-XX-YY.  AA:BB:, … represents the hex of the luminaireid, XX the lightsource position (incremental but may contain gaps) and YY the lightpoint position (index of light in luminaire group).  A gap in the lightpoint position indicates an incomplete luminaire (light search required to discover missing light points in this case).";
    } else  if (key == "swversion") {
        to["description"] = "An identifier for the software version running on the light.";
    } else  if (key == "streaming") {
        to["description"] = "Current light supports streaming features";
        to["properties"] = {"renderer": {"type": "boolean", "description": "Indicates if a lamp can be used for entertainment streaming as renderer"},
        "proxy":{"type": "boolean", "description": "Indicates if a lamp can be used for entertainment streaming as a proxy node"}}
    } else if (key == "swupdate") {
        to["description"] = "Software update status of light";
        to["properties"] = {"state": {"type": "string", "description": "Indicates if any update is ready"},
        "lastinstall":{"type": "string", "format": "date-time" , "description": "Indicates the last update time"}}
    } else {
        if(Array.isArray(value)) {//js counts array as object
            to["type"] = "array";
            to["items"] = [];
            for (var inner_key = 0; inner_key < value.length; inner_key++) {
                to["items"].push({});
                setTypeOfPropertyAndDescriptionOfLightProperty(inner_key, value[inner_key],to["items"][inner_key]) 
            }
        } else if (to["type"] == "object") {
            to["properties"] = {};
            for (const inner_key in value) {
                to["properties"][inner_key] = {};
                setTypeOfPropertyAndDescriptionOfLightProperty(inner_key, value[inner_key],to["properties"][inner_key])
            }
            // to["properties"] = {};
            // for (const inner_key in value) {
            //     to["properties"][inner_key] = {};
            //     to["properties"][inner_key]["type"] = typeof value[inner_key];
            // }
        }
    }
}

function createStateFromStateObject(state) {
    var stateObj = {};
    stateObj["type"] = "object";
    stateObj["properties"] = {};
    var stateProperties = stateObj["properties"];
    for (const key in state) {
        stateProperties[key] = {};
        setTypeOfPropertyAndDescriptionOfLight(key,state[key],stateProperties[key])
    }
    return stateObj;
}

function setTypeOfPropertyAndDescriptionOfLight(key,value,to) {
    if(key == "on") {
        to["type"] = "boolean";
        to["description"] = "On/Off state of the light. On=true, Off=false";
    } else if (key == "bri") {
        to["type"] = "integer";
        to["description"] = "Brightness level of the light.";
        to["minimum"] = 1;
        to["maximum"] = 254;
    } else if (key == "reachable") {
        to["type"] = "boolean";
        to["description"] = "Indicates if a light can be reached by the bridge";
    } else if (key == "hue") {
        to["type"] = "integer";
        to["description"] = "Hue value of the light";
        to["minimum"] = 0;
        to["maximum"] = 65535;
    } else if (key == "sat") {
        to["type"] = "integer";
        to["description"] = "Saturation of the light. 254 is the most saturated (colored) and 0 is the least saturated (white)";
        to["minimum"] = 0;
        to["maximum"] = 254;
    } else if (key == "ct") {
        to["type"] = "integer";
        to["description"] = "The Mired Color temperature of the light.";
        to["minimum"] = 153;
        to["maximum"] = 500;
    } else if (key == "alert") {
            to["description"] = "The alert effect, which is a temporary change to the bulb’s state.'l' of lselect stands for loop.";
            to["type"] = "string";
            to["enum"] = ["none","select","lselect"];
    } else if (key == "colormode") {
        to["description"] = "Indicates the color mode in which the light is working, this is the last command type it received. Values are “hs” for Hue and Saturation, “xy” for XY and “ct” for Color Temperature.",
        to["type"] = "string",
        to["enum"] = ["xy","ct","hs"];
    } else if (key == "xy") {
        to["description"] = "The x and y coordinates of a color in CIE color space.";
        to["type"] = "array";
        to["items"] = [{"type": "float","description": "X coordinate"},{"type": "float","description": "Y coordinate"}];
    } else if (key == "mode") {
        to["description"] = "Mode of the light";
        to["type"] = "string";
    } else if (key == "effect") {
        to["description"] = "The dynamic effect of the light, can either be “none” or “colorloop”.If set to colorloop, the light will cycle through all hues using the current brightness and saturation settings.",
        to["type"] = "string",
        to["enum"] = ["none","colorloop"];
    } else {
        to["type"] = typeof value;
    }
}

function addBasics(to) {
    to["@context"] = [
        "https://www.w3.org/2019/wot/td/v1",
        {
          "@language": "en"
        }
    ];
    to["title"] = "Philips HUE Bridge Device";
    to["security"] = [
        "nosec_sc"
    ];
    to["securityDefinitions"] = {
        "nosec_sc": {
          "scheme": "nosec"
        }
    };
    to["description"] = "Auto generated TD from devices connected to Philips Hue Bridge";
    to["properties"] = {};
    to["actions"] = {};
}
