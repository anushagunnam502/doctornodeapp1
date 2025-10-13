const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const routes = require('./routes'); // <- IMPORTANT

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json()); // <- parses JSON bodies
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/', (_req, res) => res.send('API OK'));
app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use(routes); // <- MOUNT ROUTES

const PORT = Number(process.env.PORT || 5000);
const HOST = '127.0.0.1';
app.listen(PORT, HOST, () => console.log('API running on http://' + HOST + ':' + PORT));
