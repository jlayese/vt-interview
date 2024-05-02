import * as http from 'http';
import * as url from 'url';
import axios from 'axios';

const hostname = '127.0.0.1';
const port = 5000;
const API = 'https://api.nobelprize.org/v1/prize.json';

interface postRequestDataInterface {
  firstName: string;
  lastName: string;
  category: string;
  year: string;
}

interface Laureates {
  id: string;
  firstname: string;
  surname: string;
  motivation: string;
  share: string;
}

interface NobelPrizeData {
  year: string;
  category: string;
  laureates: Laureates[];
}

const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const requestData: postRequestDataInterface = JSON.parse(body);

        const firstName = requestData.firstName && requestData.firstName !== '' ? requestData.firstName : null;
        const lastName = requestData.lastName && requestData.lastName !== '' ? requestData.lastName : null;

        const response = await axios.get(API);
        let data: NobelPrizeData[] = response?.data?.prizes ?? [];

        data = data.filter((item: NobelPrizeData) => {
          const laureatesApi = item.laureates ?? [];
          let laureates: Laureates[] = [];

          const firstNameRegex = new RegExp(firstName, 'i'); // 'i' flag for case-insensitive matching
          const lastNameRegex = new RegExp(lastName, 'i');

          if (!firstName && !lastName) {
            laureates = item.laureates
          } else if (firstName && lastName) {
            laureates = laureatesApi.filter(laureate => firstNameRegex.test(laureate.firstname) && lastNameRegex.test(laureate.surname))
          } else if (firstName && !lastName) {
            laureates = laureatesApi.filter(laureate => firstNameRegex.test(laureate.firstname));
          } else if (!firstName && lastName) {
            laureates = laureatesApi.filter(laureate => lastNameRegex.test(laureate.surname));
          }

          item.laureates = laureates;

          return (!requestData.year || item.year === requestData.year) &&
            (!requestData.category || item.category === requestData.category) &&
            item.laureates.length
        });

        res.end(JSON.stringify({ message: 'Data received', requestData, data }));
      } catch (error) {
        console.error('Error parsing request data:', error);
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON data' }));
      }
    });
  } else if (req.method === 'GET') {
    try {
      const response = await axios.get(API);
      const data = response.data;

      res.end(JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching data from the API:', error);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
