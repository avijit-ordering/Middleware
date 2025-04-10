const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const B1_URL = 'https://51.103.23.201:50000/b1s/v1';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// In-memory session cookie storage
let sapSessionCookie = null;

// 🟢 Login Endpoint
app.post('/api/login', async (req, res) => {

  try {
    console.log('4354')
    //const { CompanyDB, UserName, Password } = req.body;

    const loginResponse = await axios.post(`${B1_URL}/Login`, {
      "CompanyDB": "Z_BIANCO_111124",
      "Password": "1234",
      "UserName": "B1i"
    }, {
      headers: { 'Content-Type': 'application/json' },
      httpsAgent
    });

    sapSessionCookie = loginResponse.headers['set-cookie'];

    res.json(loginResponse.data);
  } catch (error) {

    console.error('Login error:', error.response?.data || error.message);
    res.status(401).json({ error: 'Login failed', details: error.response?.data });
  }
});

// 🟡 Get Open Orders Endpoint
app.get('/api/openOrder/:CardCode', async (req, res) => {
  try {
    const { CardCode } = req.params;   
    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const orderResponse = await axios.get(`${B1_URL}/Orders?$select=CardCode,CardName,DocNum,DocEntry,DocDate,NumAtCard,DocCurrency,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments&$filter=CardCode eq '${CardCode}' and DocumentStatus eq 'bost_Open'&$orderby=DocEntry desc`, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});

// 🟡 Get Open Invoices Endpoint
app.get('/api/openInvoice/:CardCode', async (req, res) => {
  try {
    const { CardCode } = req.params;   
    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const orderResponse = await axios.get(`${B1_URL}/Invoices?$select=CardCode,CardName,DocNum,DocEntry,DocDate,NumAtCard,DocCurrency,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments&$filter=CardCode eq '${CardCode}' and DocumentStatus eq 'bost_Open'&$orderby=DocEntry desc`, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
