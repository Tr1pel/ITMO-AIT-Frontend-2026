const path = require("path");
const jsonServer = require("json-server");

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const middlewares = jsonServer.defaults();

const PORT = Number(process.env.PORT || 3000);

server.use(middlewares);
server.use(jsonServer.bodyParser);

function sanitizeUser(user) {
  if (!user) return null;

  const { password, ...safeUser } = user;
  return safeUser;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

server.post("/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email и пароль обязательны." });
  }

  const user = router.db
    .get("users")
    .find((item) => item.email.toLowerCase() === email && item.password === password)
    .value();

  if (!user) {
    return res.status(401).json({ message: "Неверный email или пароль." });
  }

  return res.status(200).json({ user: sanitizeUser(user) });
});

server.post("/register", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");
  const accountType = req.body.accountType === "organizer" ? "organizer" : "buyer";

  if (!isNonEmptyString(name)) {
    return res.status(400).json({ message: "Укажите имя." });
  }

  if (!isNonEmptyString(email)) {
    return res.status(400).json({ message: "Укажите email." });
  }

  if (!isNonEmptyString(phone)) {
    return res.status(400).json({ message: "Укажите телефон." });
  }

  if (!isNonEmptyString(password)) {
    return res.status(400).json({ message: "Укажите пароль." });
  }

  const existingUser = router.db
    .get("users")
    .find((item) => item.email.toLowerCase() === email)
    .value();

  if (existingUser) {
    return res.status(409).json({ message: "Пользователь с таким email уже зарегистрирован." });
  }

  const newUser = {
    id: `user_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
    name,
    email,
    phone,
    password,
    accountType,
    tickets: [],
    refunds: [],
    organizerEvents: [],
  };

  router.db.get("users").push(newUser).write();

  return res.status(201).json({ user: sanitizeUser(newUser) });
});

server.use(router);

server.listen(PORT, () => {
  console.log(`Mock API is running on http://localhost:${PORT}`);
});
