// ---------- storage ----------
const STORAGE_KEY = "bepcuatoi.dishes.v1";
const uid = () => Math.random().toString(36).slice(2, 10);

const seed = () => [
  {
    id: uid(),
    name: "Trứng chiên",
    emoji: "🍳",
    ingredients: [
      { id: uid(), name: "Trứng gà", qty: "3 quả" },
      { id: uid(), name: "Hành lá", qty: "1 nhánh" },
      { id: uid(), name: "Nước mắm", qty: "1 muỗng cà phê" },
      { id: uid(), name: "Dầu ăn", qty: "1 muỗng canh" },
    ],
    steps: [
      { id: uid(), text: "Đập trứng vào tô, thêm nước mắm rồi đánh đều." },
      { id: uid(), text: "Xắt nhỏ hành lá, cho vào tô trứng." },
      { id: uid(), text: "Bắc chảo lên bếp, cho dầu vào đun nóng." },
      { id: uid(), text: "Đổ trứng vào chảo, chiên lửa vừa đến khi vàng hai mặt." },
    ],
  },
  {
    id: uid(),
    name: "Cơm chiên",
    emoji: "🍚",
    ingredients: [
      { id: uid(), name: "Cơm nguội", qty: "2 chén" },
      { id: uid(), name: "Trứng gà", qty: "2 quả" },
      { id: uid(), name: "Xúc xích", qty: "1 cây" },
      { id: uid(), name: "Hành tây", qty: "1/2 củ" },
      { id: uid(), name: "Nước tương", qty: "2 muỗng canh" },
    ],
    steps: [
      { id: uid(), text: "Xắt hạt lựu xúc xích và hành tây." },
      { id: uid(), text: "Phi thơm hành tây, cho xúc xích vào xào chín." },
      { id: uid(), text: "Đẩy qua một bên, đổ trứng vào đảo cho tơi." },
      { id: uid(), text: "Cho cơm vào, đảo đều tay trên lửa lớn." },
      { id: uid(), text: "Nêm nước tương, đảo thêm 2 phút rồi tắt bếp." },
    ],
  },
];

function loadDishes() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const dishes = seed();
    saveDishes(dishes);
    return dishes;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDishes(dishes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
}

let dishes = loadDishes();
let activeDishId = null;
let cookStep = 0;

// ---------- dom refs ----------
const screenMenu = document.getElementById("screen-menu");
const screenDetail = document.getElementById("screen-detail");
const screenCook = document.getElementById("screen-cook");
const dishGrid = document.getElementById("dish-grid");

const dishNameInput = document.getElementById("dish-name-input");
const dishEmojiInput = document.getElementById("dish-emoji-input");
const ingredientList = document.getElementById("ingredient-list");
const stepList = document.getElementById("step-list");
const btnStartCook = document.getElementById("btn-start-cook");

const cookStepNum = document.getElementById("cook-step-num");
const cookStepText = document.getElementById("cook-step-text");
const cookCounter = document.getElementById("cook-counter");
const progressFill = document.getElementById("progress-fill");
const btnPrevStep = document.getElementById("btn-prev-step");
const btnNextStep = document.getElementById("btn-next-step");

const screenShopping = document.getElementById("screen-shopping");
const btnGoShopping = document.getElementById("btn-go-shopping");
const shoppingTitle = document.getElementById("shopping-title");
const shoppingList = document.getElementById("shopping-list");
const shoppingCounter = document.getElementById("shopping-counter");
const shoppingProgressFill = document.getElementById("shopping-progress-fill");

function showScreen(el) {
  [screenMenu, screenDetail, screenCook, screenShopping].forEach((s) => s.classList.add("hidden"));
  el.classList.remove("hidden");
}

function getDish(id) {
  return dishes.find((d) => d.id === id);
}

// ---------- menu screen ----------
function renderMenu() {
  dishGrid.innerHTML = "";
  if (dishes.length === 0) {
    dishGrid.innerHTML = `<div class="empty-state">Chưa có món nào.<br>Bấm nút + để thêm món đầu tiên!</div>`;
    return;
  }
  for (const dish of dishes) {
    const card = document.createElement("div");
    card.className = "dish-card";
    card.innerHTML = `
      <button class="dish-remove" aria-label="Xoá ${escapeHtml(dish.name)}">✕</button>
      <div class="emoji">${escapeHtml(dish.emoji || "🍽️")}</div>
      <div class="name">${escapeHtml(dish.name || "Món chưa đặt tên")}</div>
      <div class="meta">${dish.ingredients.length} nguyên liệu · ${dish.steps.length} bước</div>
    `;
    card.addEventListener("click", (e) => {
      if (e.target.closest(".dish-remove")) return;
      openDish(dish.id);
    });
    card.querySelector(".dish-remove").addEventListener("click", () => {
      if (confirm(`Xoá món "${dish.name}"?`)) {
        dishes = dishes.filter((d) => d.id !== dish.id);
        saveDishes(dishes);
        renderMenu();
      }
    });
    dishGrid.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Xuất/nhập toàn bộ dữ liệu qua prompt() — dùng để chuyển dữ liệu giữa 2 bản
// (VD: bản chạy trên mạng LAN cũ và bản deploy mới), vì đó là 2 origin khác
// nhau nên localStorage không tự đồng bộ. Dùng prompt() thay vì Clipboard API
// vì HTTP trên mạng LAN không phải secure context, clipboard API sẽ bị chặn.
document.getElementById("btn-export").addEventListener("click", () => {
  const json = JSON.stringify(dishes);
  prompt("Chọn hết đoạn dưới đây, copy rồi dán qua app mới ở nút Nhập (⇩):", json);
});

document.getElementById("btn-import").addEventListener("click", () => {
  const text = prompt("Dán dữ liệu đã copy từ app cũ vào đây:");
  if (!text) return;
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    alert("Dữ liệu không hợp lệ (không đọc được JSON).");
    return;
  }
  if (!Array.isArray(parsed)) {
    alert("Dữ liệu không hợp lệ (phải là danh sách món ăn).");
    return;
  }
  if (!confirm(`Thay thế toàn bộ ${dishes.length} món hiện tại bằng ${parsed.length} món vừa nhập?`)) return;
  dishes = parsed;
  saveDishes(dishes);
  renderMenu();
  alert("Đã nhập xong!");
});

document.getElementById("btn-add-dish").addEventListener("click", () => {
  const dish = { id: uid(), name: "", emoji: "🍽️", ingredients: [], steps: [] };
  dishes.push(dish);
  saveDishes(dishes);
  openDish(dish.id);
  setTimeout(() => dishNameInput.focus(), 50);
});

// ---------- detail screen ----------
function openDish(id) {
  activeDishId = id;
  showScreen(screenDetail);
  renderDetail();
}

function renderDetail() {
  const dish = getDish(activeDishId);
  if (!dish) return;
  dishNameInput.value = dish.name;
  dishEmojiInput.value = dish.emoji || "🍽️";
  renderIngredients(dish);
  renderSteps(dish);
  btnStartCook.disabled = dish.steps.length === 0;
  btnGoShopping.disabled = dish.ingredients.length === 0;
}

function persistActiveDish() {
  saveDishes(dishes);
}

dishNameInput.addEventListener("input", () => {
  const dish = getDish(activeDishId);
  dish.name = dishNameInput.value;
  persistActiveDish();
});

dishEmojiInput.addEventListener("input", () => {
  const dish = getDish(activeDishId);
  dish.emoji = dishEmojiInput.value;
  persistActiveDish();
});

document.getElementById("btn-back").addEventListener("click", () => {
  renderMenu();
  showScreen(screenMenu);
});

document.getElementById("btn-delete-dish").addEventListener("click", () => {
  const dish = getDish(activeDishId);
  if (!dish) return;
  if (confirm(`Xoá món "${dish.name || "này"}"?`)) {
    dishes = dishes.filter((d) => d.id !== activeDishId);
    saveDishes(dishes);
    renderMenu();
    showScreen(screenMenu);
  }
});

// ---- ingredients ----
function renderIngredients(dish) {
  ingredientList.innerHTML = "";
  if (dish.ingredients.length === 0) {
    ingredientList.innerHTML = `<li class="empty-state" style="padding:20px 0;">Chưa có nguyên liệu nào.</li>`;
  }
  for (const ing of dish.ingredients) {
    const li = document.createElement("li");
    li.className = "ingredient-row";
    li.innerHTML = `
      <textarea class="ing-name" rows="1" placeholder="Tên nguyên liệu" enterkeyhint="next">${escapeHtml(ing.name)}</textarea>
      <textarea class="ing-qty" rows="1" placeholder="Số lượng" enterkeyhint="next">${escapeHtml(ing.qty)}</textarea>
      <button class="row-remove" aria-label="Xoá nguyên liệu">✕</button>
    `;
    const nameInput = li.querySelector(".ing-name");
    const qtyInput = li.querySelector(".ing-qty");
    nameInput.addEventListener("input", (e) => {
      ing.name = e.target.value;
      persistActiveDish();
      autoGrow(nameInput);
    });
    qtyInput.addEventListener("input", (e) => {
      ing.qty = e.target.value;
      persistActiveDish();
      autoGrow(qtyInput);
    });
    // Enter on tên -> nhảy sang ô số lượng; Enter trên số lượng -> thêm dòng mới ngay dưới dòng này
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        qtyInput.focus();
      }
    });
    qtyInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addIngredientRow(ing.id);
      }
    });
    li.querySelector(".row-remove").addEventListener("click", () => {
      const dish2 = getDish(activeDishId);
      dish2.ingredients = dish2.ingredients.filter((i) => i.id !== ing.id);
      persistActiveDish();
      renderIngredients(dish2);
    });
    ingredientList.appendChild(li);
    autoGrow(nameInput);
    autoGrow(qtyInput);
  }
}

// afterId: chèn dòng mới ngay sau nguyên liệu này; bỏ trống = thêm vào cuối (nút "+ Thêm")
function addIngredientRow(afterId) {
  const dish = getDish(activeDishId);
  const newIng = { id: uid(), name: "", qty: "", checked: false };
  const idx = afterId ? dish.ingredients.findIndex((i) => i.id === afterId) : -1;
  const insertAt = idx === -1 ? dish.ingredients.length : idx + 1;
  dish.ingredients.splice(insertAt, 0, newIng);
  persistActiveDish();
  renderIngredients(dish);
  const focusTarget = ingredientList.querySelectorAll(".ingredient-row")[insertAt]?.querySelector(".ing-name");
  focusTarget?.focus();
  // bàn phím iOS mở sau focus() một nhịp — đợi rồi mới scroll để không bị che
  requestAnimationFrame(() => {
    setTimeout(() => focusTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 150);
  });
}

document.getElementById("btn-add-ingredient").addEventListener("click", () => addIngredientRow());

// ---- steps ----
function renderSteps(dish) {
  stepList.innerHTML = "";
  if (dish.steps.length === 0) {
    stepList.innerHTML = `<li class="empty-state" style="padding:20px 0;">Chưa có bước nào.</li>`;
  }
  dish.steps.forEach((step, idx) => {
    const li = document.createElement("li");
    li.className = "step-row";
    li.innerHTML = `
      <div class="step-num">${idx + 1}</div>
      <textarea rows="1" placeholder="Mô tả bước ${idx + 1}...">${escapeHtml(step.text)}</textarea>
      <button class="row-remove" aria-label="Xoá bước">✕</button>
    `;
    const textarea = li.querySelector("textarea");
    textarea.addEventListener("input", () => {
      step.text = textarea.value;
      persistActiveDish();
      autoGrow(textarea);
    });
    // Enter -> thêm bước mới ngay dưới; Shift+Enter -> xuống dòng trong cùng bước
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        addStepRow(step.id);
      }
    });
    li.querySelector(".row-remove").addEventListener("click", () => {
      const dish2 = getDish(activeDishId);
      dish2.steps = dish2.steps.filter((s) => s.id !== step.id);
      persistActiveDish();
      renderSteps(dish2);
      btnStartCook.disabled = dish2.steps.length === 0;
    });
    stepList.appendChild(li);
    autoGrow(textarea);
  });
}

function autoGrow(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = textarea.scrollHeight + "px";
}

// afterId: chèn bước mới ngay sau bước này; bỏ trống = thêm vào cuối (nút "+ Thêm")
function addStepRow(afterId) {
  const dish = getDish(activeDishId);
  const newStep = { id: uid(), text: "" };
  const idx = afterId ? dish.steps.findIndex((s) => s.id === afterId) : -1;
  const insertAt = idx === -1 ? dish.steps.length : idx + 1;
  dish.steps.splice(insertAt, 0, newStep);
  persistActiveDish();
  renderSteps(dish);
  btnStartCook.disabled = dish.steps.length === 0;
  const focusTarget = stepList.querySelectorAll(".step-row")[insertAt]?.querySelector("textarea");
  focusTarget?.focus();
  // bàn phím iOS mở sau focus() một nhịp — đợi rồi mới scroll để không bị che
  requestAnimationFrame(() => {
    setTimeout(() => focusTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 150);
  });
}

document.getElementById("btn-add-step").addEventListener("click", () => addStepRow());

// ---------- cook mode ----------
btnStartCook.addEventListener("click", () => {
  const dish = getDish(activeDishId);
  if (!dish || dish.steps.length === 0) return;
  cookStep = 0;
  renderCookStep();
  showScreen(screenCook);
});

document.getElementById("btn-exit-cook").addEventListener("click", () => {
  showScreen(screenDetail);
});

function renderCookStep() {
  const dish = getDish(activeDishId);
  const total = dish.steps.length;
  const step = dish.steps[cookStep];
  cookStepNum.textContent = cookStep + 1;
  cookStepText.textContent = step.text || "(chưa có nội dung cho bước này)";
  cookCounter.textContent = `${cookStep + 1} / ${total}`;
  progressFill.style.width = `${((cookStep + 1) / total) * 100}%`;
  btnPrevStep.disabled = cookStep === 0;
  btnNextStep.textContent = cookStep === total - 1 ? "Hoàn thành! 🎉" : "Xong bước này ▶";
}

btnPrevStep.addEventListener("click", () => {
  if (cookStep > 0) {
    cookStep--;
    renderCookStep();
  }
});

btnNextStep.addEventListener("click", () => {
  const dish = getDish(activeDishId);
  if (cookStep < dish.steps.length - 1) {
    cookStep++;
    renderCookStep();
  } else {
    showScreen(screenDetail);
  }
});

// ---------- shopping mode ----------
btnGoShopping.addEventListener("click", () => {
  const dish = getDish(activeDishId);
  if (!dish || dish.ingredients.length === 0) return;
  shoppingTitle.textContent = `Đi chợ · ${dish.name || "Món ăn"}`;
  renderShopping(dish);
  showScreen(screenShopping);
});

document.getElementById("btn-back-shopping").addEventListener("click", () => {
  showScreen(screenDetail);
});

document.getElementById("btn-reset-shopping").addEventListener("click", () => {
  const dish = getDish(activeDishId);
  dish.ingredients.forEach((ing) => (ing.checked = false));
  persistActiveDish();
  renderShopping(dish);
});

function renderShopping(dish) {
  shoppingList.innerHTML = "";
  for (const ing of dish.ingredients) {
    const li = document.createElement("li");
    li.className = "shopping-item" + (ing.checked ? " checked" : "");
    li.innerHTML = `
      <div class="shopping-check">✓</div>
      <div class="shopping-text">
        <div class="shopping-name">${escapeHtml(ing.name || "(chưa đặt tên)")}</div>
        ${ing.qty ? `<div class="shopping-qty">${escapeHtml(ing.qty)}</div>` : ""}
      </div>
    `;
    li.addEventListener("click", () => {
      ing.checked = !ing.checked;
      persistActiveDish();
      renderShopping(dish);
    });
    shoppingList.appendChild(li);
  }
  const total = dish.ingredients.length;
  const done = dish.ingredients.filter((i) => i.checked).length;
  shoppingCounter.textContent = `${done} / ${total}`;
  shoppingProgressFill.style.width = total ? `${(done / total) * 100}%` : "0%";
}

// ---------- boot ----------
renderMenu();
showScreen(screenMenu);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
