const router = require('express').Router()
const news   = require('../data/news.json')

router.get('/', (_req, res) => res.json(news))

module.exports = router
