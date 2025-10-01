const { Telegraf, Markup } = require("telegraf");
const { saveUser, getAllUsers, getUserByTelegramId } = require("./db");

const catalogLabel = require("./data/catalogLabel");
const catalogs = require("./data/catalogs");
const videos = require("./data/videos");
const certificates = require("./data/certificates");
const socials = require("./data/socials");
const roles = require("./data/roles");
const presentations = require("./data/presentations");


const bot = new Telegraf("7939466163:AAHSHdyDpTLTobDGW09jtmh9e9JBdj1fiJI");

// Telegram ID користувачів з доступом до адмін-панелі
const adminIds = [214781828, 404752714, 716230412];

// Тимчасове збереження даних користувача перед роллю
const userSessions = new Map();
const adminPages = new Map(); // key: admin ID, value: current page

bot.start((ctx) => {
    const userId = ctx.from.id.toString();

    getUserByTelegramId(userId, (user) => {
        if (user) {
            ctx.reply(
                `👋 Вітаємо Вас знову на інформаціному порталі Vikna Style, ${user.name || "користувач"}!\nОсь ваше меню:`,
                getMainMenu(adminIds.includes(ctx.from.id))
            );
        } else {
            ctx.reply(
                "Привіт! Надішліть, будь ласка, свій контакт:",
                Markup.keyboard([
                    Markup.button.contactRequest("📱 Надіслати контакт")
                ]).resize()
            );
        }
    });
});

// Отримуємо контакт і зберігаємо тимчасово
bot.on("contact", (ctx) => {
    const contact = ctx.message.contact;

    userSessions.set(ctx.from.id.toString(), {
        telegram_id: ctx.from.id.toString(),
        username: ctx.from.username || "",
        name: ctx.from.first_name + " " + (ctx.from.last_name || ""),
        phone: contact.phone_number
    });

    ctx.reply(
        "Хто ви?",
        Markup.keyboard(roles).resize().oneTime()
    );
});
const groupChats = new Set();

// Отримуємо роль, зберігаємо в базу і показуємо головне меню
const flatRoles = roles.flat(); // плоский масив

bot.hears(flatRoles, (ctx) => {
    const role = ctx.message.text;
    const session = userSessions.get(ctx.from.id.toString());

    if (!session) {
        return ctx.reply("😔 Дані не знайдені. Надішліть контакт ще раз: /start");
    }

    getUserByTelegramId(session.telegram_id, (user) => {
        if (user) {
            ctx.reply("Ви вже зареєстровані. Ось меню:", getMainMenu(ctx.from.id));
            userSessions.delete(ctx.from.id);
        } else {
            const newUser = { ...session, role };
            saveUser(newUser);
            userSessions.delete(ctx.from.id);
            ctx.reply("Дякуємо за реєстрацію! Ось меню:", getMainMenu(ctx.from.id));
        }
    });
});


// Головне меню — звичайна клавіатура
function getMainMenu(userId) {
    const isAdmin = adminIds.includes(Number(userId));
    const buttons = [
        ["📂 Каталоги", "🎁 Презентації"],
        ["🎥 Відео виробника", "📜 Сертифікати"],
        ["📱 Ми у TikTok", "📸 Наш Instagram"],
        ["📘 Наш Facebook", "💬 Спільнота у Viber"]
    ];

    if (isAdmin) {
        buttons.push(["📣 Розсилка"]);
    }

    return Markup.keyboard(buttons).resize();
}

// Обробка кнопок головного меню та підменю

function chunk(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

bot.hears("📂 Каталоги", (ctx) => {
    const buttons = chunk(catalogLabel, 3);
    buttons.push(["⬅️ Назад"]);
    ctx.reply("Оберіть каталог:", Markup.keyboard(buttons).resize());
});

catalogs.forEach((catalog) => {
    bot.hears(catalog.label, (ctx) => {
        const filepath = `./files/catalogs/${catalog.file}`;
        ctx.reply(`Ось посилання на ${catalog.label}:`);
        ctx.replyWithDocument({
            source: filepath,
            filename: catalog.file
        });
    });
});

// const chunk = (arr, size) => {
//     const result = [];
//     for (let i = 0; i < arr.length; i += size) {
//         result.push(arr.slice(i, i + size));
//     }
//     return result;
// };

bot.hears("🎁 Презентації", (ctx) => {
    const buttons = chunk(presentations.map(p => p.label), 2); // по 2 в ряд
    buttons.push(["⬅️ Назад"]);
    ctx.reply("Оберіть мову презентації:", Markup.keyboard(buttons).resize());
});


presentations.forEach((presentation) => {
    bot.hears(presentation.label, (ctx) => {
        const filepath = `./files/presentations/${presentation.file}`;
        ctx.reply(`Ось файл ${presentation.label}:`);
        ctx.replyWithDocument({
            source: filepath,
            filename: presentation.file
        });
    });
});


// Допоміжна функція для розбиття на підмасиви по 2

// Клавіатура з відео по 2 в ряд
bot.hears("🎥 Відео виробника", (ctx) => {
    const buttons = chunk(videos.map(video => video.title), 2); // по 2 в ряд
    buttons.push(["⬅️ Назад"]);
    ctx.reply("Оберіть відео:", Markup.keyboard(buttons).resize());
});

videos.forEach(video => {
    bot.hears(video.title, (ctx) => {
        ctx.reply(`${video.title}:\n${video.url}`);
    });
});


bot.hears("📜 Сертифікати", (ctx) => {
    const buttons = chunk(certificates.map(c => c.title), 2);
    buttons.push(["⬅️ Назад"]);
    ctx.reply("Оберіть сертифікати:", Markup.keyboard(buttons).resize());
});

certificates.forEach(c => {
    bot.hears(c.title, (ctx) => {
        ctx.reply(`${c.title}:\n${c.url}`);
    });
});

socials.forEach(s => {
    bot.hears(s.title, (ctx) => {
        ctx.reply(`${s.title}:\n${s.url}`);
    });
});

// Кнопка назад до головного меню
bot.hears("⬅️ Назад", (ctx) => {
    ctx.reply("Повертаємось у головне меню:", getMainMenu(ctx.from.id));
});

// Команда адміна /admin для перегляду користувачів
bot.command("admin", (ctx) => {
    if (!adminIds.includes(ctx.from.id)) {
        return ctx.reply("🚫 У вас немає доступу до адмін-панелі.");
    }

    const page = 1;
    adminPages.set(ctx.from.id, page);
    sendAdminPage(ctx, page);
});

async function sendAdminPage(ctx, page = 1) {
    const perPage = 10;

    const users = await getAllUsers(); // 🟢 тепер асинхронно

    const total = users.length;
    if (!total) return ctx.reply("Ще немає зареєстрованих користувачів.");

    const totalPages = Math.ceil(total / perPage);
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * perPage;
    const end = start + perPage;
    const usersOnPage = users.slice(start, end);

    let text = `👥 Зареєстровані користувачі (сторінка ${page} з ${totalPages}):\n\n`;
    usersOnPage.forEach((user, i) => {
        text += `${start + i + 1}. 🆔 ${user.telegram_id}${user.username ? `, @${user.username}` : ""}\n` +
            `👤 ${user.name}\n📞 ${user.phone}\n🎯 ${user.role}\n\n`;
    });

    const buttons = [];
    if (page > 1) buttons.push("⬅️ Попередня");
    if (page < totalPages) buttons.push("➡️ Наступна");

    ctx.reply(text, Markup.keyboard([
        buttons,
        ["⬅️ Назад"]
    ]).resize());
}


bot.hears("⬅️ Попередня", (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;

    const currentPage = adminPages.get(ctx.from.id) || 1;
    if (currentPage > 1) {
        const newPage = currentPage - 1;
        adminPages.set(ctx.from.id, newPage);
        sendAdminPage(ctx, newPage);
    }
});

bot.hears("➡️ Наступна", async (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;

    const currentPage = adminPages.get(ctx.from.id) || 1;
    const perPage = 10;

    const users = await getAllUsers(); // 🟢
    const totalPages = Math.ceil(users.length / perPage);
    if (currentPage < totalPages) {
        const newPage = currentPage + 1;
        adminPages.set(ctx.from.id, newPage);
        sendAdminPage(ctx, newPage);
    }
});


// Розсилка повідомлень усім користувачам
const groupChatIds = new Set([
    -1001292061252, // ← вручну додана група
]);
const broadcastState = new Map();

bot.hears("📣 Розсилка", (ctx) => {
    if (!adminIds.includes(ctx.from.id)) return;

    broadcastState.set(ctx.from.id, { step: "askFile" });
    ctx.reply("❓ Хочете додати файл до повідомлення?", Markup.keyboard([
        ["Так", "Ні"],
        ["⬅️ Назад"]
    ]).resize());
});

bot.on("message", async (ctx) => {
    const userId = ctx.from.id;
    const state = broadcastState.get(userId);
    if (!adminIds.includes(userId) || !state) return;

    const msg = ctx.message;

    // 1. Хочете файл?
    if (state.step === "askFile") {
        if (msg.text === "Так") {
            state.step = "waitingFile";
            ctx.reply("📎 Надішліть файл, який хочете прикріпити.", {
                reply_markup: { remove_keyboard: true }
            });
        } else if (msg.text === "Ні") {
            state.step = "waitingText";
            ctx.reply("✏️ Введіть текст повідомлення:", {
                reply_markup: { remove_keyboard: true }
            });
        }
        return;
    }

    // 2. Очікування файлу
    if (state.step === "waitingFile") {
        const mediaTypes = ["photo", "video", "document", "audio", "voice"];
        const mediaType = mediaTypes.find((t) => msg[t]);

        if (!mediaType) {
            return ctx.reply("⚠️ Це не файл. Надішліть файл.");
        }

        state.mediaType = mediaType;
        state.fileId = msg[mediaType][0]?.file_id || msg[mediaType]?.file_id;
        state.step = "waitingText";

        return ctx.reply("✏️ Тепер введіть текст повідомлення:");
    }

    // 3. Очікування тексту
    if (state.step === "waitingText") {
        state.text = msg.text || msg.caption || "";
        state.step = "confirmAudience";

        let preview = "📝 <b>Попередній перегляд:</b>\n\n";
        if (state.fileId) preview += `📎 Прикріплено файл (${state.mediaType})\n`;
        preview += `🗒️ Текст:\n${state.text}`;

        ctx.reply(preview, {
            parse_mode: "HTML",
            ...Markup.inlineKeyboard([
                [Markup.button.callback("👤 Користувачам", "send_users")],
                [Markup.button.callback("👥 Групам", "send_groups")],
                [Markup.button.callback("📢 Всім", "send_all")],
                [Markup.button.callback("❌ Скасувати", "confirm_cancel")]
            ])
        });
    }
});

// Функція надсилання
async function sendBroadcast(ctx, sendTo = "all") {
    const userId = ctx.from.id;
    const state = broadcastState.get(userId);
    if (!state) return ctx.answerCbQuery("Немає активної розсилки.");

    await ctx.answerCbQuery("⏳ Розсилка почалась...");

    const users = await getAllUsers();
    const groups = Array.from(groupChatIds);

    let recipients = [];
    if (sendTo === "users") recipients = users.map(u => u.telegram_id);
    else if (sendTo === "groups") recipients = groups;
    else recipients = [...users.map(u => u.telegram_id), ...groups];

    let success = 0, failed = 0;

    for (const chatId of recipients) {
        try {
            const options = {
                caption: state.text + "\n\nЗ повагою, Компанія 🪟 «Вікна Стиль Трейдінг»",
                parse_mode: "HTML"
            };

            if (state.fileId && state.mediaType) {
                switch (state.mediaType) {
                    case "photo": await ctx.telegram.sendPhoto(chatId, state.fileId, options); break;
                    case "video": await ctx.telegram.sendVideo(chatId, state.fileId, options); break;
                    case "document": await ctx.telegram.sendDocument(chatId, state.fileId, options); break;
                    case "audio": await ctx.telegram.sendAudio(chatId, state.fileId, options); break;
                    case "voice": await ctx.telegram.sendVoice(chatId, state.fileId, options); break;
                }
            } else {
                await ctx.telegram.sendMessage(chatId, state.text + "\n\nЗ повагою, команда 🪟 Vikna Style", {
                    parse_mode: "HTML"
                });
            }

            success++;
        } catch (err) {
            console.error(`❌ Помилка для ${chatId}:`, err.message);
            failed++;
        }
    }

    broadcastState.delete(userId);
    ctx.editMessageText(`✅ Розсилка завершена:\n📨 Надіслано: ${success}\n❌ Помилок: ${failed}`);
    ctx.reply("Повертаємось у головне меню:", getMainMenu(userId));
}

// Обробники кнопок
bot.action("send_users", (ctx) => sendBroadcast(ctx, "users"));
bot.action("send_groups", (ctx) => sendBroadcast(ctx, "groups"));
bot.action("send_all", (ctx) => sendBroadcast(ctx, "all"));

bot.action("confirm_cancel", async (ctx) => {
    const userId = ctx.from.id;
    broadcastState.delete(userId);

    await ctx.answerCbQuery("❌ Скасовано");
    try {
        await ctx.editMessageText("Розсилку скасовано.");
    } catch (e) {}

    ctx.reply("Повертаємось у головне меню:", getMainMenu(userId));
});

const port = process.env.PORT || 8080;

bot.launch({
  webhook: {
    domain: "https://viknastylebot-production.up.railway.app",
    port: port,
  }
});
console.log("🤖 Бот запущено на ${domain}:${port}");
