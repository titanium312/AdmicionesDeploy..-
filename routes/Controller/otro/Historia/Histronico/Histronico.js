const Histronico = (req, res) => {
  const lista = [
    { marine: true },
    { juan: "for" },
    { leonel: "estas" },
  ];

  const key = Object.keys(req.query)[0];

  if (!key) {
    return res.json(lista);
  }

  const found = lista.find(obj => obj[key] !== undefined);

  if (!found) {
    return res.status(404).send("No encontrado");
  }

  return res.send(String(found[key]));
};

module.exports = { Histronico };