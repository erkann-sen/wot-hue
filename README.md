# WoT Philips Hue 

A JavaScript code which creates a consumable [Thing Description(TD)](https://www.w3.org/2019/wot/td) file, using connection with Philips Hue Bridge.
Every light and sensor are represented together in hueBridgeTD.json and also every light thing is represented in their own TD in created `light TDs` folder, every sensor thing is represented in their own TD in created `sensor TDs` folder for other use possibilities.

## Get Ready
* Get the latest node.js
```bash
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs
```
* Clone the repository
	`git clone https://github.com/erkann-sen/wot-hue.git`
* Install packages
	`npm install`

## Usage 

* Be sure that your Hue Bridge is on and connected to internet
* Run below code, fill your bridge ip and username fields
`node convert.js http://<your_hue_brige_ip> <your_bridge_user_name>`
You can also open convert.js and fill `ipOfHueBridge` and `userName` fields, then the code can also be used with just `node convert.js`
* A Thing Description(TD), which has all devices connected to the hue bridge is generated in same folder with name hueBridgeTD.json
* Every light and sensor also have it own TD in "light TDs" and "sensor TDs" folders respectively. 
* The generated TD files, ready for consumption
