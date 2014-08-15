<img src="http://mesecons.net/random/mnscreens/hcs3202.jpg" align="right" />
# MansonNode
A web frontend for Manson HCS power supplies writting in node.js. It even runs on a Raspberry Pi and can be accessed from multiple devices at the same time.

## Screenshots
<img src="http://mesecons.net/random/mnscreens/mansonnode.png" width=500px />
<img src="http://mesecons.net/random/mnscreens/mansonnode2.png" width=500px />

### Warning: See disclaimer in the LICENSE file!

## Installation
### Archlinux
* Install git, nodejs and npm

        sudo pacman -Sy git nodejs

* Download MansonNode:

        git clone https://github.com/Jeija/mansonnode.git

* Install dependencies

        cd mansonnode
        npm install

### Ubuntu
* Install git, nodejs and npm

        sudo apt install git nodejs nodejs-legacy npm

* Download MansonNode:

        git clone https://github.com/Jeija/mansonnode.git

* Install dependencies

        cd mansonnode
        npm install

### Debian
* Install git, nodejs and npm

        apt-get install curl lsb-release
        curl -sL https://deb.nodesource.com/setup | bash -
        sudo apt install git nodejs nodejs-legacy npm

* Download MansonNode:

        git clone https://github.com/Jeija/mansonnode.git

* Install dependencies

        cd mansonnode
        npm install

### Raspberry Pi (Archlinux ARM)
<img src="http://mesecons.net/random/mnscreens/rpi.png" align="right" />
* Put ArchlinuxARM on your SD card, following the instructions [here](http://archlinuxarm.org/platforms/armv6/raspberry-pi)
* SSH into the Raspberry Pi
* Install git, serialport dependencies, nodejs and npm

        pacman -Sy git base-devel python2 nodejs

* Download MansonNode:

        git clone https://github.com/Jeija/mansonnode.git

* Install dependencies

        cd mansonnode
        PYTHON=python2 npm install

### Windows
There is no reason why it shouldn't work on Windows (all modules are cross-platform), but you will have to figure out how to install it on Windows yourself. It would be great if you could submit an installation guide for this website if you tested it.

### Configuration
In some cases you **must** edit configuration options in the source code to make it work. You can find the config at the top of the **server.js** file.

** This software was only tested with the Manson HCS 3202 **
Different Manson HCS versions use different numbers of decimal digits for current values in their protocol.

* 1 decimal place for current value: HCS-3100, 3150, 3200, 3202
* 2 decimal places for current value: HCS-3102, 3014, 3204
* If your PSU is not in this list, you will very likely find the information in your user's manual.

1 place is the default setting. Change `var DECIMAL_PLACES = 1;` to `var DECIMAL_PLACES = 2;` in order to use a power supply with two decimal places.

* Baudrate: Should be the same for all HCS PSUs, 9600 baud
* TCP Port: Port to access the fronted from a webbrowser
* UPDATE_TIME: Interval in which the software will update its information about the PSU

## Run

        node server.js /dev/ttyUSBx

Where you have to replace /dev/ttyUSBx with the serial port the Manson HCS is connected to, so for instance

        node server.js /dev/ttyUSB0

## Open in Chrome / Chromium
I do not recommend to use any other browser than recent webkit-based ones!
Simply visit `localhost:4444`. If you have mansonnode on a Raspberry Pi, just replace localhost with the Pi's IP. You propably won't even realize a performance difference between your PC and the Pi!

### Play around with the UI! You can drag around widgets to create the UI you need for your project.

## Contribute
If you want to help others by contributing to this project, simply send a pull request to this GitHub repo.
