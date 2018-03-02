const express = require('express');
const app = express();
const fs = require('fs');
const transactions = JSON.parse(fs.readFileSync('data.json', 'utf8'));
let port = process.env.PORT || 3339;
app.use('/chart', express.static(__dirname + '/node_modules/chart.js/dist/'));
app.use('/js', express.static(__dirname + '/src/js/'));
app.use('/css', express.static(__dirname + '/src/css/'));

app.get('/', function (request, response) {
  response.sendFile(__dirname + '/src/views/index.html');
});

app.get('/api/transactions/:startDate/:endDate', function (request, response) {
  let startDate = new Date(request.params.startDate);
  let endDate = new Date(request.params.endDate);
  let responseJson = [];
  for(let i = 0; i < transactions.length; i++) {
    let transaction = transactions[i];
    let transactionDate = new Date(transaction.date);
    if(startDate < transactionDate < endDate) {
      responseJson.push(transaction);
    }
  }
  response.setHeader('Content-Type', 'application/json');
  setTimeout(function () {
    response.json(responseJson);
  }, 100);
});

app.listen(port, function () {
  console.log(`Open http://localhost:${port} in your browser`);
});