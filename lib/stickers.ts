/**
 * Curated emoji sticker library. Emoji-based so it renders natively on every
 * device and platform without shipping image assets. Grouped by feel so the
 * picker can show tabs / sections.
 */

export type StickerCategory = {
  id: string;
  label: string;
  emojis: string[];
};

/**
 * Keyword hints used for the sticker picker search. Not every emoji needs
 * explicit keywords — search also falls back to the category label, so e.g.
 * typing "love" returns everything in the Love category.
 */
export const EMOJI_KEYWORDS: Record<string, string[]> = {
  // love
  "❤️": ["heart","love","red"], "🧡": ["heart","love","orange"],
  "💛": ["heart","love","yellow"], "💚": ["heart","love","green"],
  "💙": ["heart","love","blue"], "💜": ["heart","love","purple"],
  "🤎": ["heart","love","brown"], "🖤": ["heart","love","black"],
  "🤍": ["heart","love","white"], "❤️‍🔥": ["heart","fire","passion"],
  "❤️‍🩹": ["heart","mend","healing"], "💕": ["hearts","love"],
  "💖": ["sparkling","heart","love"], "💗": ["growing","heart"],
  "💘": ["arrow","cupid","heart"], "💝": ["gift","heart","ribbon"],
  "💞": ["revolving","hearts"], "💓": ["beating","heart"],
  "💟": ["decoration","heart"], "♥️": ["heart","suit"],
  "💌": ["love","letter","envelope","mail"], "💋": ["kiss","lips"],
  "🥰": ["smile","hearts","love"], "😍": ["heart","eyes","love"],
  "😘": ["kiss","blowing"], "😚": ["kiss","closed","eyes"],
  "🫶": ["heart","hands"], "🤗": ["hug","hugging"],
  "🫂": ["people","hugging"], "💑": ["couple","heart"],
  "💏": ["kiss","couple"],

  // celebrate / birthday
  "🎉": ["party","popper","celebrate","confetti"],
  "🎊": ["confetti","ball","celebrate"],
  "🎈": ["balloon","party","birthday"],
  "🎂": ["birthday","cake","candles"],
  "🍰": ["cake","slice","dessert"],
  "🧁": ["cupcake","dessert","sweet"],
  "🍾": ["champagne","bottle","celebrate"],
  "🥂": ["cheers","toast","champagne"],
  "🥳": ["party","face","hat","horn"],
  "🤩": ["star","struck","wow"],
  "🎁": ["gift","present","box"],
  "🎀": ["ribbon","bow","gift"],
  "🪅": ["pinata","party"],
  "🪩": ["disco","ball","mirror"],
  "🎇": ["sparkler","firework"],
  "🎆": ["fireworks","celebrate"],
  "🏆": ["trophy","winner","award"],
  "🥇": ["first","medal","gold","winner"],
  "🥈": ["second","medal","silver"],
  "🥉": ["third","medal","bronze"],
  "🎖️": ["military","medal","award"],
  "👑": ["crown","royal","king","queen"],
  "💃": ["dance","woman"], "🕺": ["dance","man"],
  "🪄": ["magic","wand"],
  "🕯️": ["candle","light","flame"],

  // nature
  "🌸": ["cherry","blossom","flower","pink"],
  "🌺": ["hibiscus","flower","tropical"],
  "🌹": ["rose","flower","red","love"],
  "🌻": ["sunflower","flower","yellow"],
  "🌷": ["tulip","flower"],
  "🌼": ["daisy","flower","yellow"],
  "💐": ["bouquet","flowers"],
  "🪷": ["lotus","flower"],
  "🪻": ["hyacinth","flower","purple"],
  "🏵️": ["rosette","flower"],
  "🌿": ["herb","leaf","plant"],
  "🍀": ["clover","luck","four","leaf"],
  "🌱": ["seedling","sprout","plant"],
  "🌾": ["wheat","grain"],
  "🌵": ["cactus","desert"],
  "🍃": ["leaves","wind"],
  "🍂": ["fallen","leaves","autumn"],
  "🍁": ["maple","leaf","autumn"],
  "🌳": ["tree","deciduous"],
  "🌲": ["evergreen","tree","pine"],
  "🌴": ["palm","tree","tropical"],
  "🌰": ["chestnut","nut"],
  "🍄": ["mushroom","fungi"],
  "🌊": ["wave","ocean","water"],

  // sparkle / sky
  "⭐": ["star"], "🌟": ["glowing","star","sparkle"],
  "✨": ["sparkles","shiny","magic"], "💫": ["dizzy","star","swirl"],
  "⚡": ["bolt","lightning","electric"],
  "☄️": ["comet","shooting","star"],
  "🪐": ["planet","ringed","saturn","space"],
  "🌠": ["shooting","star"],
  "💎": ["gem","diamond","jewel"],
  "🔮": ["crystal","ball","magic","future"],
  "☀️": ["sun","sunny"],
  "🌙": ["crescent","moon","night"],
  "🌈": ["rainbow","pride"],
  "❄️": ["snowflake","cold","winter"],
  "☃️": ["snowman","snow","winter"],
  "⛄": ["snowman","snow"],
  "🌧️": ["rain","cloud"], "⛈️": ["thunder","storm"],

  // animals
  "🦋": ["butterfly","insect","wings"],
  "🐝": ["bee","honey","insect"],
  "🐞": ["ladybug","beetle","insect"],
  "🦄": ["unicorn","magic","fantasy"],
  "🐰": ["rabbit","bunny"],
  "🐻": ["bear"],
  "🐼": ["panda","bear"],
  "🐨": ["koala","bear"],
  "🐱": ["cat","kitty"],
  "🐶": ["dog","puppy"],
  "🐾": ["paw","prints","animal"],
  "🦊": ["fox"],
  "🐢": ["turtle"],
  "🕊️": ["dove","peace","bird"],
  "🐧": ["penguin","bird"],
  "🐣": ["hatching","chick","baby"],
  "🐥": ["chick","baby","bird","yellow"],
  "🦆": ["duck","bird"],
  "🐙": ["octopus"],
  "🐬": ["dolphin"],
  "🐳": ["whale","ocean"],

  // treats
  "🍓": ["strawberry","berry","red"],
  "🍒": ["cherries","fruit"],
  "🍑": ["peach","fruit"],
  "🍎": ["apple","red","fruit"],
  "🍉": ["watermelon","fruit"],
  "🍇": ["grapes","fruit"],
  "🍦": ["ice","cream","soft","serve"],
  "🍨": ["ice","cream","scoop"],
  "🍩": ["donut","doughnut"],
  "🍪": ["cookie","biscuit"],
  "🍫": ["chocolate","bar"],
  "🍬": ["candy","sweet"],
  "🍭": ["lollipop","candy"],
  "☕": ["coffee","tea","hot","drink"],
  "🍵": ["tea","matcha"],
  "🍷": ["wine","glass"],

  // postal
  "✉️": ["envelope","mail","letter"],
  "📧": ["email","mail","at"],
  "📨": ["incoming","envelope","mail"],
  "📩": ["envelope","arrow","mail"],
  "📤": ["outbox","send","mail"],
  "📥": ["inbox","receive","mail"],
  "📦": ["package","box","parcel","shipping"],
  "📮": ["postbox","mailbox","post"],
  "📬": ["mailbox","flag","mail"],
  "📫": ["mailbox","closed","flag"],
  "📪": ["mailbox","closed"],
  "📭": ["mailbox","open","empty"],
  "📝": ["memo","note","write"],
  "✒️": ["nib","pen","ink"],
  "🖋️": ["fountain","pen"],
  "🖊️": ["pen","ballpoint"],
  "✏️": ["pencil","write","edit"],
  "🖍️": ["crayon","color"],
  "📜": ["scroll","parchment","old"],
  "📃": ["page","curl","paper"],
  "📄": ["page","document","paper"],
  "📋": ["clipboard","list"],
  "📌": ["pushpin","pin"],
  "📍": ["round","pushpin","location"],
  "🔖": ["bookmark"],
  "🪶": ["feather","quill"],

  // travel
  "✈️": ["airplane","plane","flight"],
  "🚀": ["rocket","space","launch"],
  "🛸": ["ufo","alien","space"],
  "⛵": ["sailboat","boat"],
  "🚢": ["ship","cruise"],
  "🏝️": ["island","beach","tropical"],
  "🏖️": ["beach","umbrella","sun"],
  "🌍": ["earth","globe","world"],
  "🗺️": ["map","world"],
  "🧳": ["luggage","suitcase","travel"],
  "🎒": ["backpack","school","bag"],
  "📸": ["camera","flash","photo"],
  "🏕️": ["camping","tent"],
  "🎡": ["ferris","wheel","amusement"],
  "🎢": ["roller","coaster","amusement"],
  "🎪": ["circus","tent"],

  // faces (commonly searched)
  "😀": ["grinning","happy","smile"],
  "😂": ["joy","tears","laugh","lol"],
  "🤣": ["rofl","rolling","laugh"],
  "😊": ["smile","blush","happy"],
  "😎": ["cool","sunglasses"],
  "🥲": ["smiling","tear","grateful"],
  "😭": ["cry","sob","sad"],
  "😢": ["cry","sad","tear"],
  "🥺": ["pleading","puppy","eyes"],
  "🫡": ["salute","respect"],
  "🤔": ["think","hmm"],
  "🙏": ["pray","thanks","please"],
  "👍": ["thumbs","up","like","ok"],
  "👎": ["thumbs","down","dislike"],
  "👏": ["clap","applause"],
  "🙌": ["raised","hands","celebrate","praise"],
  "🤝": ["handshake","deal","agreement"],
  "✌️": ["peace","victory"],
  "🤞": ["crossed","fingers","luck"],
  "👋": ["wave","hi","hello","bye"],
};

/**
 * Returns the list of emojis matching a query across all categories.
 * Matches against keyword hints *and* the category label that contains the
 * emoji — typing "love" returns every emoji tagged "love" and every emoji in
 * the Love category. Empty query returns empty array.
 */
export function searchStickers(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const cat of STICKER_LIBRARY) {
    const labelMatches = tokens.every((t) =>
      cat.label.toLowerCase().includes(t) || cat.id.toLowerCase().includes(t),
    );
    for (const emoji of cat.emojis) {
      if (seen.has(emoji)) continue;
      const kw = EMOJI_KEYWORDS[emoji] ?? [];
      const kwMatches = tokens.every((t) => kw.some((k) => k.includes(t)));
      if (labelMatches || kwMatches) {
        seen.add(emoji);
        out.push(emoji);
      }
    }
  }
  return out;
}

export const STICKER_LIBRARY: StickerCategory[] = [
  {
    id: "love",
    label: "Love",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🤎","🖤","🤍","❤️‍🔥","❤️‍🩹",
      "💕","💖","💗","💘","💝","💞","💓","💟","♥️","💌","💋",
      "🥰","😍","😘","😚","🫶","🤗","🫂","💑","💏",
      "💐","🌹","🌷","🍫","🍷","🕯️",
    ],
  },
  {
    id: "celebrate",
    label: "Celebrate",
    emojis: [
      "🎉","🎊","🎈","🎂","🍰","🧁","🍾","🥂","🥳","🤩",
      "🎁","🎀","🪅","🪩","🎇","🎆","✨","🌟","⭐","💫",
      "🎗️","🏆","🥇","🥈","🥉","🎖️","👑","💃","🕺","🪄",
      "🍭","🍬","🎵","🎶",
    ],
  },
  {
    id: "birthday",
    label: "Birthday",
    emojis: [
      "🎂","🧁","🍰","🎈","🎉","🎊","🎁","🎀","🕯️","🪅",
      "👑","🥳","🍦","🍨","🍧","🍩","🍪","🍫","🍬","🍭",
      "🎵","🎶","📯","🎺","✨","💫","🌟","⭐","🪩","🎇",
    ],
  },
  {
    id: "nature",
    label: "Nature",
    emojis: [
      "🌸","🌺","🌹","🌻","🌷","🌼","💐","🪷","🪻","🏵️",
      "🌿","🍀","🌱","🌾","🌵","🍃","🍂","🍁","🌳","🌲",
      "🌴","🪴","🎋","🎍","🌰","🍄","🐚","🪨","🌊",
    ],
  },
  {
    id: "sparkle",
    label: "Sparkle",
    emojis: [
      "⭐","🌟","✨","💫","🎇","🎆","⚡","☄️","🪐","🌠",
      "💎","🔆","🌞","🪩","🔮","🕯️","🎐","🫧","💥","❇️",
      "✴️","✳️","❄️","🌀",
    ],
  },
  {
    id: "sky",
    label: "Sky & Weather",
    emojis: [
      "☀️","🌞","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️",
      "❄️","☃️","⛄","🌨️","🌪️","🌫️","🌈","🌙","🌛","🌜",
      "🌚","🌝","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔",
      "⚡","💨","🪐",
    ],
  },
  {
    id: "cute",
    label: "Cute animals",
    emojis: [
      "🐣","🐥","🐤","🐔","🦆","🦢","🕊️","🦉","🦜","🐧",
      "🦋","🐝","🐞","🐛","🐌","🪲","🪰","🐜","🦗",
      "🦄","🐰","🐇","🐻","🐼","🐨","🐱","😺","😸","😻",
      "🐶","🐕","🦮","🐩","🐾","🐹","🐭","🐢",
      "🦊","🐿️","🦔","🦦","🦥","🐑","🦙","🐮","🐷","🐸",
      "🐒","🐵","🦒","🐘","🐳","🐬","🐟","🐠","🐙","🦀",
    ],
  },
  {
    id: "treats",
    label: "Treats",
    emojis: [
      "🍓","🍒","🍑","🍐","🍎","🍏","🍊","🍋","🍌","🍉",
      "🍇","🫐","🥝","🍍","🥭","🍈","🥥","🍅",
      "🍰","🧁","🍪","🍩","🍮","🍯","🍡","🥐","🥯","🍞",
      "🥞","🧇","🍿","🍫","🍬","🍭","🥮","🍢","🍨","🍧",
      "🍦","🥧","☕","🍵","🍶","🧋","🥛","🍼","🧃","🫖",
    ],
  },
  {
    id: "postal",
    label: "Postal",
    emojis: [
      "💌","✉️","📧","📨","📩","📤","📥","📦","📮","📬",
      "📫","📪","📭","🕊️","📝","✒️","🖋️","🖊️","✏️","🖍️",
      "📜","📃","📄","📑","🧾","📰","🗞️","📇","📋","📌",
      "📍","🔖","🧷","🪶",
    ],
  },
  {
    id: "travel",
    label: "Travel",
    emojis: [
      "✈️","🛫","🛬","🚀","🛸","🚁","🛶","⛵","🚤","⛴️",
      "🚢","🏝️","🏖️","🌍","🌎","🌏","🗺️","🧳","🎒","📸",
      "🏔️","⛰️","🗻","🏕️","🌋","🗽","🗼","🎡","🎢","🎪",
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    emojis: [
      "❤️","💔","☮️","☯️","♾️","♻️","⚜️","🔱","☸️","🕉️",
      "✡️","☪️","✝️","☦️","⚛️","🔯","🕎","♈","♉",
      "♊","♋","♌","♍","♎","♏","♐","♑","♒","♓",
      "🆗","🆒","🆕","💯","✅","✔️","☑️","🔘","⚪","⚫",
    ],
  },
  {
    id: "faces",
    label: "Faces",
    emojis: [
      "😀","😃","😄","😁","😆","🥹","😂","🤣","🥲","☺️",
      "😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗",
      "😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓",
      "😎","🥸","🤩","🥳","😏","😒","🙄","😬","🤥","😔",
      "😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵",
      "🥶","🥴","😵","🤯","🤠","🥺","🫣","🫡","🤫","🤭",
    ],
  },
  {
    id: "hands",
    label: "Hands",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞",
      "🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️",
      "🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶",
      "🤲","🤝","🙏","✍️","💅","🤳",
    ],
  },
];
