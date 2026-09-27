// بوت واتساب لمحل "تركيا للمفروشات"
// يستخدم WhatsApp Cloud API الرسمي من ميتا (مجاني)

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// ==== إعدادات (تُقرأ من ملف .env عبر متغيرات البيئة) ====
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "MAHMOUD_STORE_TOKEN";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // التوكن من Meta
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // رقم الهاتف من Meta
const OWNER_PHONE = process.env.OWNER_PHONE; // رقم صاحب المحل (لإشعاره بالطلبات)

// ==== تحميل الكتالوج ====
function loadCatalog() {
  const raw = fs.readFileSync(path.join(__dirname, "catalog.json"), "utf8");
  return JSON.parse(raw);
}

// ==== حالة كل محادثة (تُحفظ في الذاكرة، تُفرّغ عند إعادة تشغيل السيرفر) ====
const sessions = {};

function getSession(userPhone) {
  if (!sessions[userPhone]) {
    sessions[userPhone] = { step: "start" };
  }
  return sessions[userPhone];
}

// ==== إرسال رسالة نصية عبر واتساب ====
async function sendMessage(to, text) {
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("فشل إرسال الرسالة:", errText);
  }
}

// ==== بناء نص عرض الكتالوج ====
function catalogText(catalog) {
  let text = `أهلاً بك في ${catalog.store_name} 🛋️\nهذي قائمة المنتجات المتوفرة:\n\n`;
  catalog.products.forEach((p) => {
    text += `${p.id}) ${p.name} - ${p.price} ${catalog.currency}\n${p.description}\n\n`;
  });
  text += "أرسل رقم المنتج اللي يعجبك عشان تكمل الطلب.";
  return text;
}

// ==== معالجة رسالة واردة من زبون ====
async function handleIncomingMessage(userPhone, messageText, catalog) {
  const session = getSession(userPhone);
  const text = (messageText || "").trim();

  if (["مرحبا", "السلام عليكم", "هلا", "بدء", "start", "menu", "القائمة"].includes(text.toLowerCase())) {
    session.step = "browsing";
    await sendMessage(userPhone, catalogText(catalog));
    return;
  }

  switch (session.step) {
    case "start":
      session.step = "browsing";
      await sendMessage(userPhone, catalogText(catalog));
      break;

    case "browsing": {
      const product = catalog.products.find((p) => p.id === text);
      if (product) {
        session.cart = { productId: product.id, name: product.name, price: product.price };
        session.step = "ask_qty";
        await sendMessage(userPhone, `كم عدد "${product.name}" اللي تحتاجه؟`);
      } else {
        await sendMessage(
          userPhone,
          "ما فهمت رقم المنتج. أرسل رقم من القائمة، أو اكتب 'القائمة' لعرضها من جديد."
        );
      }
      break;
    }

    case "ask_qty": {
      const qty = parseInt(text, 10);
      if (!qty || qty <= 0) {
        await sendMessage(userPhone, "من فضلك أرسل رقم صحيح للكمية (مثال: 1).");
        break;
      }
      session.cart.qty = qty;
      session.step = "ask_name";
      await sendMessage(userPhone, "تمام. شنو اسمك الكامل؟");
      break;
    }

    case "ask_name":
      session.name = text;
      session.step = "ask_address";
      await sendMessage(userPhone, "وش عنوان التوصيل؟ (المدينة والحي مع أقرب معلم)");
      break;

    case "ask_address": {
      session.address = text;
      session.step = "confirm";
      const c = session.cart;
      const total = c.price * c.qty;
      await sendMessage(
        userPhone,
        `تأكيد الطلب:\n- ${c.name} × ${c.qty} = ${total} ${catalog.currency}\n- الاسم: ${session.name}\n- العنوان: ${session.address}\n\nأرسل "تأكيد" لإتمام الطلب، أو "إلغاء" للبدء من جديد.`
      );
      break;
    }

    case "confirm": {
      if (text === "تأكيد" || text.toLowerCase() === "تاكيد") {
        const c = session.cart;
        const total = c.price * c.qty;
        await sendMessage(
          userPhone,
          `تم استلام طلبك! ✅\nراح يتواصل معك أحد موظفينا قريباً لتأكيد التوصيل.\nشكراً لثقتك بـ ${catalog.store_name}.`
        );
        if (OWNER_PHONE) {
          await sendMessage(
            OWNER_PHONE,
            `📦 طلب جديد!\nالمنتج: ${c.name} × ${c.qty}\nالإجمالي: ${total} ${catalog.currency}\nالاسم: ${session.name}\nالعنوان: ${session.address}\nرقم الزبون: ${userPhone}`
          );
        }
        delete sessions[userPhone];
      } else {
        delete sessions[userPhone];
        await sendMessage(userPhone, "تم إلغاء الطلب. اكتب 'القائمة' لو تحب تبدأ من جديد.");
      }
      break;
    }

    default:
      session.step = "browsing";
      await sendMessage(userPhone, catalogText(catalog));
  }
}

// ==== التحقق من الـ Webhook ====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("تم التحقق من الـ Webhook بنجاح");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ==== استقبال الرسائل من Meta ====
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (message && message.type === "text") {
      const from = message.from;
      const text = message.text.body;
      const catalog = loadCatalog();
      await handleIncomingMessage(from, text, catalog);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("خطأ في معالجة الرسالة:", err);
    res.sendStatus(200);
  }
});

app.get("/", (req, res) => {
  res.send("بوت تركيا للمفروشات شغال ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`السيرفر شغال على المنفذ ${PORT}`);
});
