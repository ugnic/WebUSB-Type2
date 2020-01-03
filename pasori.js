let startButton = document.getElementById('start');
let idmMessage = document.getElementById('idm');
async function sleep(msec) {
  return new Promise(resolve => setTimeout(resolve, msec));
}
async function send(device, data) {
  let uint8a = new Uint8Array(data);
  console.log(">>>>>>>>>>");
  console.log(uint8a);
  await device.transferOut(2, uint8a);
  await sleep(10);
}
async function receive(device, len) {
  console.log("<<<<<<<<<<" + len);
  let data = await device.transferIn(1, len);
  console.log(data);
  await sleep(10);
  let arr = [];
  for (let i = data.data.byteOffset; i < data.data.byteLength; i++) {
    arr.push(data.data.getUint8(i));
  }
  console.log(arr);
  return arr;
}

async function sendCommand (device, cmd, params) {
  let command = [0x00, 0x00, 0xff, 0xff, 0xff];
  let data = [0xd6, cmd].concat(params);
  command = command.concat([data.length, 0, 256 - data.length]);
  command = command.concat(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  let parity = (256 - sum) % 256 + 256;
  command = command.concat([parity, 0]);
  await send(device, command);
  await receive(device, 6);
  const result = await receive(device, 40);
  return result;
}

async function session(device) {
  await send(device, [0x00, 0x00, 0xff, 0x00, 0xff, 0x00]);
  console.debug('GetProperty');
  await sendCommand(device, 0x2a, [0x01]);
  console.debug('SwitchRF');
  await sendCommand(device, 0x06, [0x00]);
  console.debug('InSetRF');
  await sendCommand(device, 0x00, [0x02, 0x03, 0x0f, 0x03]);
  console.debug('InSetProtocol');
  await sendCommand(device, 0x02, [0x00, 0x18, 0x01, 0x01, 0x02, 0x01, 0x03, 0x00, 0x04, 0x00, 0x05, 0x00, 0x06, 0x00, 0x07, 0x08, 0x08, 0x00, 0x09, 0x00, 0x0a, 0x00, 0x0b, 0x00, 0x0c, 0x00, 0x0e, 0x04, 0x0f, 0x00, 0x10, 0x00, 0x11, 0x00, 0x12, 0x00, 0x13, 0x06]);
  await sendCommand(device, 0x02, [0x01, 0x00, 0x02, 0x00, 0x05, 0x01, 0x00, 0x06, 0x07, 0x07]);
  console.debug('InCommRF:SENS');
  await sendCommand(device, 0x04, [0x36, 0x01, 0x26]);
  console.debug('InCommRF:SDD');
  await sendCommand(device, 0x02, [0x04, 0x01, 0x07, 0x08]);
  await sendCommand(device, 0x02, [0x01, 0x00, 0x02, 0x00]);
  const ssdRes = await sendCommand(device, 0x04, [0x36, 0x01, 0x93, 0x20]);
  const result = arrayToHexString(ssdRes.slice(15, 19));
  console.log(result);
  return result;
}

function arrayToHexString (arr) {
  if(arr.length > 0) {
    let result = '';
    for (let i = 0; i < arr.length; i++) {
      const val = arr[i];
      if (val < 16) {
        result += '0';
      }
      result += val.toString(16);
      idmMessage.innerText = "カードのIDm: " + result;
    }
    return result.toUpperCase();
  } else {
    return null;
  }
}

startButton.addEventListener('click', async () => {
  let device;
  try {
    device = await navigator.usb.requestDevice({'filters': [
      {'vendorId': 0x054c, 'productId': 0x06c1}
    ]});
    console.log("open");
    await device.open();
  } catch (e) {
    console.log(e);
    alert(e);
    throw e;
  }
  try {
    console.log("selectConfiguration");
    await device.selectConfiguration(1);
    console.log("claimInterface");
    await device.claimInterface(0);
    console.log(device);
    do {
      await session(device);
      await sleep(500);
    } while (true);
  } catch (e) {
    console.log(e);
    alert(e);
    try {
      device.close();
    } catch (e) {
      console.log(e);
    }
    throw e;
  }
});
