const fs = require('fs');

function fixFuelLogic(content) {
  // We want to replace the brittle if/else block with a robust regex-based extraction.
  // Instead of simple .includes() which has collision bugs (like "100%" matching "1"),
  // we'll explicitly look for exact matches or percentages first.
  
  return content.replace(/if \(flLower\.includes\('full'\).*?parsedFuel = '1 Bar';/gs, `
        if (flLower.includes('full') || flLower.includes('100%') || flLower.includes('8/8') || flLower === 'f' || flLower === '8') parsedFuel = 'Full Tank';
        else if (flLower.includes('75%') || flLower.includes('3/4') || flLower.includes('6/8')) parsedFuel = '6 Bar';
        else if (flLower.includes('50%') || flLower.includes('1/2') || flLower.includes('half') || flLower.includes('4/8')) parsedFuel = '4 Bar';
        else if (flLower.includes('25%') || flLower.includes('1/4') || flLower.includes('2/8')) parsedFuel = '2 Bar';
        else if (flLower.match(/\\b8\\b/) || flLower.includes('8 bar')) parsedFuel = 'Full Tank';
        else if (flLower.match(/\\b7\\b/) || flLower.includes('7 bar')) parsedFuel = '7 Bar';
        else if (flLower.match(/\\b6\\b/) || flLower.includes('6 bar')) parsedFuel = '6 Bar';
        else if (flLower.match(/\\b5\\b/) || flLower.includes('5 bar')) parsedFuel = '5 Bar';
        else if (flLower.match(/\\b4\\b/) || flLower.includes('4 bar')) parsedFuel = '4 Bar';
        else if (flLower.match(/\\b3\\b/) || flLower.includes('3 bar')) parsedFuel = '3 Bar';
        else if (flLower.match(/\\b2\\b/) || flLower.includes('2 bar')) parsedFuel = '2 Bar';
        else if (flLower.match(/\\b1\\b/) || flLower.includes('1 bar') || flLower.includes('low') || flLower.includes('empty') || flLower === 'e' || flLower.includes('0%')) parsedFuel = '1 Bar';
        else parsedFuel = result.fuel_level; // keep original if no match
`);
}

function fixAiServiceFuelLogic(content) {
  return content.replace(/if \(flLower\.includes\('full'\).*?fuelLevel = '1 Bar';\n\s*\}/gs, `
      if (flLower.includes('full') || flLower.includes('100%') || flLower.includes('8/8') || flLower === 'f' || flLower === '8') {
        fuelLevel = 'Full Tank';
      } else if (flLower.includes('75%') || flLower.includes('3/4') || flLower.includes('6/8')) {
        fuelLevel = '6 Bar';
      } else if (flLower.includes('50%') || flLower.includes('1/2') || flLower.includes('half') || flLower.includes('4/8')) {
        fuelLevel = '4 Bar';
      } else if (flLower.includes('25%') || flLower.includes('1/4') || flLower.includes('2/8')) {
        fuelLevel = '2 Bar';
      } else if (flLower.match(/\\b8\\b/) || flLower.includes('8 bar')) {
        fuelLevel = 'Full Tank';
      } else if (flLower.match(/\\b7\\b/) || flLower.includes('7 bar')) {
        fuelLevel = '7 Bar';
      } else if (flLower.match(/\\b6\\b/) || flLower.includes('6 bar')) {
        fuelLevel = '6 Bar';
      } else if (flLower.match(/\\b5\\b/) || flLower.includes('5 bar')) {
        fuelLevel = '5 Bar';
      } else if (flLower.match(/\\b4\\b/) || flLower.includes('4 bar')) {
        fuelLevel = '4 Bar';
      } else if (flLower.match(/\\b3\\b/) || flLower.includes('3 bar')) {
        fuelLevel = '3 Bar';
      } else if (flLower.match(/\\b2\\b/) || flLower.includes('2 bar')) {
        fuelLevel = '2 Bar';
      } else if (flLower.match(/\\b1\\b/) || flLower.includes('1 bar') || flLower.includes('low') || flLower.includes('empty') || flLower === 'e' || flLower.includes('0%')) {
        fuelLevel = '1 Bar';
      }
`);
}

let serverTs = fs.readFileSync('server.ts', 'utf8');
fs.writeFileSync('server.ts', fixFuelLogic(serverTs));

let viteTs = fs.readFileSync('vite.config.ts', 'utf8');
fs.writeFileSync('vite.config.ts', fixFuelLogic(viteTs));

let aiTs = fs.readFileSync('services/aiService.ts', 'utf8');
fs.writeFileSync('services/aiService.ts', fixAiServiceFuelLogic(aiTs));

console.log("Fixed!");
