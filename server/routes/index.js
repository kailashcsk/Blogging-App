const express = require('express');
const router = express.Router();
const { Client } = require('@elastic/elasticsearch');
const { getJson } = require("serpapi");
require('dotenv').config();

const node = process.env.ROUTE;
const api_key_id = process.env.API_KEY_ID;
const api_key_pass = process.env.API_KEY_PASS;
const api_key_serp_id = process.env.API_KEY_SERP_ID;
const client = new Client({
  node,
  auth: {
    apiKey: {
      "id": api_key_id,
      "api_key": api_key_pass,
    }
  }
});


router.post('/serpapi', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const json = await getRestaurantInfo(query);
    console.log(json)
    res.json(json);
  } catch (error) {
    console.error('Error fetching data from SerpAPI:', error);
    res.status(500).json({ error: 'Failed to fetch data from SerpAPI' });
  }
});

const getRestaurantInfo = async (restaurantQuery) => {
  return new Promise((resolve, reject) => {
    getJson({
      api_key: api_key_serp_id,
      engine: "google_local",
      google_domain: "google.com",
      q: restaurantQuery
    }, (json) => {
      resolve(json);
    });
  });
};


router.post('/store', async (req, res) => {
  try {
    const { title, content, section } = req.body;
    const currentDate = new Date().toISOString();
    const newPost = {
      title: title,
      content: content,
      section: section,
      date: currentDate,
    };

    const response = await client.index({
      index: 'blogs',
      document: newPost,
    });
    if (response.result === 'created') {
      // If 'result' is 'created', send 200 OK with a custom response
      console.log('here!');
      res.status(200).send({ message: 'Document stored successfully' });
    } else {
      // If 'result' is not 'created', send 500 with an error message
      throw new Error('Failed to store document');
    }
  } catch (error) {
    console.error('Error storing document:', error);
    res.status(500).json({ error: 'Failed to store document.' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    const body = {
      query: {
        bool: {
          must: {
            multi_match: {
              query: query,
              fields: ['title', 'content'],
            },
          },
        },
      },
    };

    const response = await client.search({
      index: 'blogs',
      body: body,
    });
    const hits = response.hits;
    const results = hits.hits.map(hit => hit._source);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents.' });
  }
});


module.exports = router;
