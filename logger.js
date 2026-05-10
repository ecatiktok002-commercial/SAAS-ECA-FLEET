const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.text({type: '*/*'}));

app.post('/log', (req, res) => {
  console.log('--- RECEIVED LOG ---');
  console.log(req.body);
  console.log('--------------------');
  res.send('ok');
});

app.listen(3001, '0.0.0.0', () => console.log('Logger listening on 3001'));
