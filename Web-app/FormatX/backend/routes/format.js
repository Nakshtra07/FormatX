const express = require("express");
const { interpretStructure } = require("../services/aiservice");
const { applyFormatting } = require("../services/formatEngine");
const ieeeTemplate = require("../templates/ieee.json");

const router = express.Router();

router.post("/", async (req, res) => {
    const { content, format } = req.body;
    let structure = await interpretStructure(content);

    let formattedHTML = applyFormatting(structure, ieeeTemplate);
    res.send(formattedHTML);
});

module.exports = router;
