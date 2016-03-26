const Parse = require('parse/node').Parse;
const GCM = require('./GCM');
const APNS = require('./APNS');

import { classifyInstallations } from './PushAdapterUtils';

export class ParsePushAdapter {

  supportsPushTracking = true;

  constructor(pushConfig = {}) {
    this.validPushTypes = ['ios', 'android'];
    this.senderMap = {};
    // used in PushController for Dashboard Features
    this.feature = {
      immediatePush: true
    };
    let pushTypes = Object.keys(pushConfig);

    for (let pushType of pushTypes) {
      if (this.validPushTypes.indexOf(pushType) < 0) {
        throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                              'Push to ' + pushTypes + ' is not supported');
      }
      switch (pushType) {
        case 'ios':
          this.senderMap[pushType] = new APNS(pushConfig[pushType]);
          break;
        case 'android':
          this.senderMap[pushType] = new GCM(pushConfig[pushType]);
          break;
      }
    }
  }

  getValidPushTypes() {
    return this.validPushTypes;
  }

  static classifyInstallations(installations, validTypes) {
    return classifyInstallations(installations, validTypes)
  }

  send(data, installations) {
    let deviceMap = classifyInstallations(installations, this.validPushTypes);
    let sendPromises = [];
    for (let pushType in deviceMap) {
      let sender = this.senderMap[pushType];
      let devices = deviceMap[pushType];
      if (!sender) {
        let results = devices.map((device) => {
          return Promise.resolve({
            device,
            transmitted: false,
            response: {'error': `Can not find sender for push type ${pushType}, ${data}`}
          })
        });
        sendPromises.push(Promise.all(results));
      } else {
        sendPromises.push(sender.send(data, devices));
      }
    }
    return Parse.Promise.when(sendPromises);
  }
}
export default ParsePushAdapter;
module.exports = ParsePushAdapter;
