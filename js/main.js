document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const lightbox = document.querySelector(".lightbox");
if (lightbox) {
  const fullImage = lightbox.querySelector("img");
  document.querySelectorAll("[data-full]").forEach((item) => {
    item.addEventListener("click", () => {
      fullImage.src = item.dataset.full;
      fullImage.alt = item.querySelector("img").alt;
      lightbox.showModal();
    });
  });
  lightbox.querySelector("button").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
}

if (window.PRODUCT_CATALOG) {
  document.querySelectorAll("[data-product-section]").forEach((container) => {
    const section = window.PRODUCT_CATALOG.find((item) => item.section === container.dataset.productSection);
    if (!section) return;
    container.innerHTML = section.cards.map((card) => `
      <article class="catalog-card">
        <img src="images/${card.image}" alt="${card.alt}" />
        <div><span class="available">В наличии</span><h3>${card.title}</h3><p>${card.description}</p><a href="order.html">Заказать →</a></div>
      </article>
    `).join("");
  });

  const chips = document.querySelector(".suggestion-chips");
  if (chips) {
    const products = window.PRODUCT_CATALOG.flatMap((section) => section.cards.flatMap((card) => card.products));
    const orderInput = document.querySelector('textarea[name="products"]');
    products.forEach((product) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "suggestion-chip";
      chip.textContent = product;
      chip.addEventListener("click", () => {
        const current = orderInput.value.trim();
        const entries = current.split(/[,;\n]+/).map((item) => item.trim().toLocaleLowerCase("ru-RU")).filter(Boolean);
        if (!entries.includes(product.toLocaleLowerCase("ru-RU"))) {
          orderInput.value = current ? `${current.replace(/[\s,;]+$/, "")}, ${product}` : product;
          orderInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
        chip.classList.add("selected");
        orderInput.focus();
      });
      chips.appendChild(chip);
    });
  }
}

const orderForm = document.querySelector("#order-form");
if (orderForm) {
  const result = document.querySelector(".order-result");
  const submitButton = orderForm.querySelector(".submit-order");
  const submitLabel = orderForm.querySelector(".submit-label");
  const status = document.querySelector("#form-status");
  orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!orderForm.checkValidity()) {
      orderForm.reportValidity();
      return;
    }
    const data = new FormData(orderForm);
    const payload = Object.fromEntries(data.entries());
    submitButton.disabled = true;
    submitLabel.textContent = "Отправляем…";
    status.textContent = "Пожалуйста, подождите.";
    status.classList.remove("error");
    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Request failed");
      orderForm.reset();
      orderForm.hidden = true;
      result.hidden = false;
    } catch (_) {
      status.textContent = "Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь с нами напрямую.";
      status.classList.add("error");
    } finally {
      submitButton.disabled = false;
      submitLabel.textContent = "Отправить заявку";
    }
  });
  document.querySelector(".start-over").addEventListener("click", () => {
    result.hidden = true;
    orderForm.hidden = false;
    status.textContent = "Владелец получит заявку в Telegram.";
    status.classList.remove("error");
  });
}
