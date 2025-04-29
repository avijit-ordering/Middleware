const express = require('express');
const axios = require('axios');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const balanceSheetUrl = 'http://51.103.23.201:8080'

const url = 'https://51.103.23.201:50000'
const B1_URL = url + '/b1s/v1';
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// In-memory session cookie storage
let sapSessionCookie = null;

// 🟢 Login Endpoint
app.post('/api/login', async (req, res) => {

  try {
    console.log('43254')
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

// IncomingPayments endpoint

app.post('/api/IncomingPayments/:CardCode', async (req, res) => {
  try {
    const { CardCode } = req.params;
    const paymentData = req.body;

    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const queryURL = `${B1_URL}/IncomingPayments`;

    const payResponse = await axios.post(queryURL, paymentData, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });

    console.log('payResponse data:', payResponse.data);

    res.json(payResponse.data);
  } catch (error) {
    console.error('Payment error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Payment failed', 
      details: error.response?.data || error.message 
    });
  }
});



// Top 10 most purchased products
app.get('/api/Top10Products/:CardCode', async (req, res) => {

  try {
    const { CardCode } = req.params;



    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const queryURL = `${balanceSheetUrl}/B1iXcellerator/exec/ipo/.DEV.IGS.GET_ALLSO_DETAIL.IGS.GET_ALLSO/com.sap.b1i.dev.scenarios.setup/IGS.GET_ALLSO_DETAIL/IGS.GET_ALLSO.ipo/GETALLSODETAIL.xxx.TOP10_PRODUCT?CardCode=${CardCode}`;
     
    const orderResponse = await axios.get(queryURL, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });
    console.log('orderResponse',orderResponse)
    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});


// Get shippingTypes

app.get('/api/shippingTypes', async (req, res) => {

  try {

    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const queryURL = `${B1_URL}/ShippingTypes?$select=Code,Name&$orderby=Code`;
     
    const orderResponse = await axios.get(queryURL, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });
    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});


// 🟡 Get  All Orders Endpoint
app.get('/api/allOrder/:CardCode', async (req, res) => {

  try {
    const { CardCode } = req.params;
    const { top = 20, skip = 0, status } = req.query;


    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }
    let filterString = `CardCode eq '${CardCode}'`;
    if (status) {
      filterString += ` and DocumentStatus eq '${status}'`;
    }
    const queryURL = `${B1_URL}/Orders?$select=CardCode,DocumentStatus,Cancelled,CardName,DocNum,DocEntry,DocDate,NumAtCard,DocCurrency,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments` +
      `&$filter=${encodeURIComponent(filterString)}&$orderby=DocEntry desc&$top=${top}&$skip=${skip}`;

    const orderResponse = await axios.get(queryURL, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });
    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});

// 🟡 Get  All Filter Orders Endpoint
app.get('/api/allFilterOrder/:CardCode', async (req, res) => {

  try {
    const { CardCode } = req.params;
    const { f_Date, t_Date, number, DocumentStatus } = req.query;

    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    let filters = [];
    if (CardCode) {
      filters.push(`CardCode eq '${CardCode}'`);
    }
    if (number) {
      filters.push(`substringof('${number}', DocNum)`);
    }
    if (DocumentStatus) {
      if(DocumentStatus == 'bost_Close'){
        filters.push(`DocumentStatus eq 'bost_Close' and Cancelled eq 'tNO'`);
      }else if (DocumentStatus == 'bost_Cancel') {
        filters.push(`DocumentStatus eq 'bost_Close' and Cancelled eq 'tYES'`);

      } else {
        filters.push(`DocumentStatus eq '${DocumentStatus}'`);

      }
    }
    if (f_Date && t_Date) {
      filters.push(`DocDate ge '${f_Date}' and DocDate le '${t_Date}'`);
    }

    const filterQuery = filters.length > 0 ? `&$filter=${filters.join(' and ')}` : '';


    const queryURL = `${B1_URL}/Orders?$select=CardCode,DocumentStatus,Cancelled,CardName,DocNum,DocEntry,DocDate,NumAtCard,DocCurrency,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments${filterQuery}&$orderby=DocEntry desc`;



    const orderResponse = await axios.get(queryURL, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });
    res.json(orderResponse.data);

  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});


// 🟡 Get  All Filter Invoice Endpoint
app.get('/api/allFilterInvoice/:CardCode', async (req, res) => {

  try {
    const { CardCode } = req.params;
    const { f_Date, t_Date, number, DocumentStatus } = req.query;

    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    let filters = [];
    if (CardCode) {
      filters.push(`CardCode eq '${CardCode}'`);
    }
    if (number) {
      filters.push(`substringof('${number}', DocNum)`);
    }
    if (DocumentStatus) {
      if(DocumentStatus == 'bost_Close'){
        filters.push(`DocumentStatus eq 'bost_Close' and Cancelled eq 'tNO'`); // Paid
      }else if (DocumentStatus == 'bost_Open') {
        filters.push(`DocumentStatus eq 'bost_Open' and PaidToDate eq 0 and Cancelled eq 'tNO'`); // pending

      } else {
        filters.push(`DocumentStatus eq 'bost_Open' and PaidToDate gt 0 and Cancelled eq 'tNO'`); // partial pending

      }
    }
    if (f_Date && t_Date) {
      filters.push(`DocDate ge '${f_Date}' and DocDate le '${t_Date}'`);
    }

    const filterQuery = filters.length > 0 ? `&$filter=${filters.join(' and ')}` : '';


    const queryURL = `${B1_URL}/Invoices?$select=CardCode,DocumentStatus,PaidToDate,CardName,DocNum,DocEntry,DocDate,NumAtCard,DocCurrency,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments${filterQuery}&$orderby=DocEntry desc`;

   // console.log('queryURL', queryURL)

    const orderResponse = await axios.get(queryURL, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });
    res.json(orderResponse.data);

  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});


// 🟡 Get  All Filter Credit notes Endpoint
app.get('/api/allFilterCreditNotes/:CardCode', async (req, res) => {

  try {
    const { CardCode } = req.params;
    const { f_Date, t_Date, number, DocumentStatus } = req.query;

    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    let filters = [];
    if (CardCode) {
      filters.push(`CardCode eq '${CardCode}'`);
    }
    if (number) {
      filters.push(`substringof('${number}', DocNum)`);
    }
    if (DocumentStatus) {
      if(DocumentStatus == 'bost_Close'){
        filters.push(`DocumentStatus eq 'bost_Close' and Cancelled eq 'tNO'`); // Paid
      }else if (DocumentStatus == 'bost_Open') {
        filters.push(`DocumentStatus eq 'bost_Open' and PaidToDate eq 0 and Cancelled eq 'tNO'`); // pending

      } else {
        filters.push(`DocumentStatus eq 'bost_Open' and PaidToDate gt 0 and Cancelled eq 'tNO'`); // partial pending

      }
    }
    if (f_Date && t_Date) {
      filters.push(`DocDate ge '${f_Date}' and DocDate le '${t_Date}'`);
    }

    const filterQuery = filters.length > 0 ? `&$filter=${filters.join(' and ')}` : '';


    const queryURL = `${B1_URL}/CreditNotes?$select=CardCode,DocumentStatus,PaidToDate,CardName,DocNum,DocEntry,DocDate,NumAtCard,DocCurrency,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments${filterQuery}&$orderby=DocEntry desc`;

    console.log('credit queryURL', queryURL)

    const orderResponse = await axios.get(queryURL, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });
    res.json(orderResponse.data);

  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});

// 🟡 Get Open Orders Endpoint
app.get('/api/openOrder/:CardCode', async (req, res) => {

  try {
    const { CardCode } = req.params;

    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const orderResponse = await axios.get(`${B1_URL}/Orders?$select=CardCode,DocumentStatus,Cancelled,CardName,DocNum,DocEntry,DocDate,NumAtCard,DocCurrency,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments&$filter=CardCode eq '${CardCode}' and DocumentStatus eq 'bost_Open'&$orderby=DocDate desc`, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});


// 🟡 Get All Invoices Endpoint
app.get('/api/allInvoice/:CardCode', async (req, res) => {

  try {
    const { CardCode } = req.params;
    const { top = 20, skip = 1, status } = req.query;

    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }
    let filterString = `CardCode eq '${CardCode}'`;
    if (status) {
      filterString += ` and DocumentStatus eq '${status}'`;
    } 
    const queryURL = `${B1_URL}/Invoices?$select=CardCode,DocumentStatus,PaidToDate,Cancelled,CardName,DocNum,DocEntry,DocDate,NumAtCard,DocCurrency,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments` +
      `&$filter=${encodeURIComponent(filterString)}&$orderby=DocEntry desc&$top=${top}&$skip=${skip}`;

    console.log('queryURL', queryURL)

    const orderResponse = await axios.get(queryURL, {
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

    const orderResponse = await axios.get(`${B1_URL}/Invoices?$select=CardCode,DocumentStatus,PaidToDate,Cancelled,CardName,DocNum,DocEntry,DocDate,NumAtCard,DocCurrency,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments&$filter=CardCode eq '${CardCode}' and DocumentStatus eq 'bost_Open'&$orderby=DocEntry desc`, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});

// 🟡 Get  Order Details Endpoint
app.get('/api/orderDetails/:DocNum', async (req, res) => {
  try {
    const { DocNum } = req.params;

    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const orderResponse = await axios.get(`${B1_URL}/Orders?$filter=DocNum eq ${DocNum}`, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});

// 🟡 Get  Invoice Details Endpoint
app.get('/api/invoiceDetails/:DocEntry', async (req, res) => {
  try {
    const { DocEntry } = req.params;
    console.log('DocEntry', DocEntry)
    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const orderResponse = await axios.get(`${B1_URL}/Invoices?$filter=DocEntry eq ${DocEntry}`, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});


// 🟡 Get invoiceDownload Endpoint
app.get('/api/invoiceDownload/:DocEntry', async (req, res) => {
  try {
    const { DocEntry } = req.params;
    console.log('DocEntry', DocEntry)
    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const orderResponse = await axios.get(`${B1_URL}/$crossjoin(Invoices,Attachments2,Attachments2/Attachments2_Lines)?$expand=Attachments2/Attachments2_Lines($select=FileName,FileExtension)&$filter=Invoices/AttachmentEntry eq Attachments2/AbsoluteEntry and Attachments2/AbsoluteEntry eq Attachments2/Attachments2_Lines/AbsoluteEntry and Invoices/Cancelled eq 'N' and Invoices/DocEntry eq ${DocEntry}`, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});

// 🟡 Get orderDownload Endpoint
app.get('/api/orderDownload/:DocEntry', async (req, res) => {
  try {
    const { DocEntry } = req.params;
    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const orderResponse = await axios.get(`${B1_URL}/$crossjoin(Orders,Attachments2,Attachments2/Attachments2_Lines)?$expand=Attachments2/Attachments2_Lines($select=FileName,FileExtension)&$filter=Orders/AttachmentEntry eq Attachments2/AbsoluteEntry and Attachments2/AbsoluteEntry eq Attachments2/Attachments2_Lines/AbsoluteEntry and Orders/Cancelled eq 'N' and Orders/DocEntry eq ${DocEntry}`, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});


// 🟡 Get  All Credit Note List Endpoint
app.get('/api/CreditNotes/:CardCode', async (req, res) => {

  try {
    const { CardCode } = req.params;
    const { top = 20, skip = 1, status } = req.query;




    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }
    let filterString = `CardCode eq '${CardCode}'`;

    const queryURL = `${B1_URL}/CreditNotes?$select=CardCode,CardName,DocNum,DocEntry,DocDate,NumAtCard,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments` +
      `&$filter=${encodeURIComponent(filterString)}&$orderby=DocEntry desc`;

    const orderResponse = await axios.get(queryURL, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });
    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});

// 🟡 Get  Credit Notes Details Endpoint
app.get('/api/creditNoteDetails/:DocNum', async (req, res) => {
  try {
    const { DocNum } = req.params;
    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const orderResponse = await axios.get(`${B1_URL}/CreditNotes?$filter=DocNum eq ${DocNum}`, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });
    // console.log('DocNum',orderResponse.data)

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});

// 🟡 Get  Balance sheet list Endpoint
app.get('/api/balanceSheetList/:CardCode', async (req, res) => {
  try {
    const { CardCode } = req.params;
    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }
    //console.log(`${balanceSheetUrl}/B1iXcellerator/exec/ipo/.DEV.IGS.GET_ALLSO_DETAIL.IGS.GET_ALLSO/com.sap.b1i.dev.scenarios.setup/IGS.GET_ALLSO_DETAIL/IGS.GET_ALLSO.ipo/GETALLSODETAIL.IGS.CUST_ACBALANCE?CardCode=${CardCode}&FromDate=20230101&ToDate=20270131`)

    const orderResponse = await axios.get(`${balanceSheetUrl}/B1iXcellerator/exec/ipo/.DEV.IGS.GET_ALLSO_DETAIL.IGS.GET_ALLSO/com.sap.b1i.dev.scenarios.setup/IGS.GET_ALLSO_DETAIL/IGS.GET_ALLSO.ipo/GETALLSODETAIL.IGS.CUST_ACBALANCE?CardCode=${CardCode}&FromDate=20230101&ToDate=20270131`, {
      headers: { Cookie: sapSessionCookie.join('; ') },
      httpsAgent
    });
    //console.log('DocNum',orderResponse.data)

    res.json(orderResponse.data);
  } catch (error) {
    console.error('Order fetch error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch order', details: error.response?.data });
  }
});



// 🟡 Get All Invoices Endpoint
app.get('/api/allQuotations/:CardCode', async (req, res) => {

  try {
    const { CardCode } = req.params;
    const { top = 20, skip = 1 } = req.query;
    console.log('CardCode', CardCode)
    if (!sapSessionCookie) {
      return res.status(401).json({ error: 'Not logged in. Please login first.' });
    }

    const queryURL = `${B1_URL}/Quotations?$select=CardCode,CardName,DocumentStatus,DocNum,DocEntry,DocDate,NumAtCard,DocCurrency,DiscountPercent,TotalDiscount,VatSum,DocTotal,Comments&$filter=CardCode eq '${CardCode}'&$orderby=DocDate desc&$top=${top}&$skip=${skip}`;
    console.log('que1111ryURL', queryURL)
    const orderResponse = await axios.get(queryURL, {
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
