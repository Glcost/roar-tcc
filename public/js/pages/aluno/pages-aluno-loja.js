/* ============================================================
   ROAR — pages-aluno-loja.js
   Controlador da Loja de Dinos, Compra e Equipamento
   ============================================================ */

import { avatarService } from "../../services/avatar-service.js";
import { showToast } from "../../components/toast.js";

const elements = {
    userXp: document.getElementById("storeUserXp"),
    activeMascotImg: document.getElementById("storeActiveMascotImg"),
    activeMascotName: document.getElementById("storeActiveMascotName"),
    heroPreviewImg: document.getElementById("storeHeroPreviewImg"),
    dinoGrid: document.getElementById("dinoGrid"),
    search: document.getElementById("storeSearch"),
    sort: document.getElementById("storeSort"),
    resultCount: document.getElementById("storeResultCount"),
    tabs: document.querySelectorAll(".store-tab-btn"),
    btnTreinoXp: document.getElementById("btnTreinoXp"),

    // Contadores das abas
    countAll: document.getElementById("countAll"),
    countComum: document.getElementById("countComum"),
    countRaro: document.getElementById("countRaro"),
    countEpico: document.getElementById("countEpico"),
    countLendario: document.getElementById("countLendario"),
    countMitico: document.getElementById("countMitico"),
    countOwned: document.getElementById("countOwned"),

    // Modal
    modalBackdrop: document.getElementById("storeModalBackdrop"),
    modalCloseBtn: document.getElementById("modalCloseBtn"),
    modalCancelBtn: document.getElementById("modalCancelBtn"),
    modalConfirmBtn: document.getElementById("modalConfirmBtn"),
    modalDinoImg: document.getElementById("modalDinoImg"),
    modalDinoName: document.getElementById("modalDinoName"),
    modalXpCurrent: document.getElementById("modalXpCurrent"),
    modalXpCost: document.getElementById("modalXpCost"),
    modalXpRemaining: document.getElementById("modalXpRemaining"),

    // Confetti canvas
    confettiCanvas: document.getElementById("confettiCanvas"),
};

let currentFilter = "all";
let pendingPurchaseDino = null;

const RARITY_ORDER = Object.freeze({
    padrao: 0,
    comum: 1,
    raro: 2,
    epico: 3,
    lendario: 4,
    mitico: 5,
});

/* ------------------------------------------------------------
   AUDIO FEEDBACK
   ------------------------------------------------------------ */
function playSound(type = "success") {
    try {
        if (window.roarSoundFx) {
            if (type === "celebration" && typeof window.roarSoundFx.playAchievement === "function") {
                window.roarSoundFx.playAchievement();
                return;
            }
            if (typeof window.roarSoundFx.playSuccess === "function") {
                window.roarSoundFx.playSuccess();
                return;
            }
        }
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t = ctx.currentTime;
            osc.type = "sine";
            osc.frequency.setValueAtTime(type === "celebration" ? 659.25 : 523.25, t);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.18);
        }
    } catch { }
}

/* ------------------------------------------------------------
   CONFETE CANVAS (60FPS PURO SEM DEPENDÊNCIA EXTERNA)
   ------------------------------------------------------------ */
function launchConfetti() {
    const canvas = elements.confettiCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#44F698", "#85C7F2", "#1F6CE3", "#244D8C", "#F59E0B"];
    const particles = [];
    const count = 90;

    for (let i = 0; i < count; i++) {
        particles.push({
            x: canvas.width * 0.5 + (Math.random() - 0.5) * 100,
            y: canvas.height * 0.45 + (Math.random() - 0.5) * 50,
            r: Math.random() * 6 + 4,
            d: Math.random() * count,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 16,
            vy: (Math.random() - 0.8) * 18,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 8,
            tilt: Math.random() * 10 - 10,
            tiltAngle: 0,
            tiltAngleInc: Math.random() * 0.08 + 0.05,
            opacity: 1,
        });
    }

    let animationFrame;
    const startTime = Date.now();

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const elapsed = Date.now() - startTime;

        let alive = false;
        particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.45;
            p.vx *= 0.98;
            p.rotation += p.rotSpeed;
            p.tiltAngle += p.tiltAngleInc;
            p.tilt = Math.sin(p.tiltAngle) * 15;

            if (elapsed > 1800) {
                p.opacity -= 0.03;
            }

            if (p.opacity > 0 && p.y < canvas.height) {
                alive = true;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
                ctx.restore();
            }
        });

        if (alive && elapsed < 3500) {
            animationFrame = requestAnimationFrame(draw);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            cancelAnimationFrame(animationFrame);
        }
    }

    draw();
}

/* ------------------------------------------------------------
   ATUALIZAÇÃO DA INTERFACE DO HERO & TOTAIS
   ------------------------------------------------------------ */
function renderHeaderStats() {
    const xp = avatarService.getXp();
    const equippedDino = avatarService.getEquippedDino();
    const equippedImgPath = avatarService.resolveImagePath(equippedDino);

    if (elements.userXp) {
        elements.userXp.textContent = xp.toLocaleString("pt-BR");
    }

    if (elements.activeMascotImg) {
        elements.activeMascotImg.src = equippedImgPath;
        elements.activeMascotImg.alt = equippedDino.name;
    }

    if (elements.activeMascotName) {
        elements.activeMascotName.textContent = equippedDino.name;
    }

    if (elements.heroPreviewImg) {
        elements.heroPreviewImg.src = equippedImgPath;
        elements.heroPreviewImg.alt = equippedDino.name;
    }

    const catalog = avatarService.getCatalog();
    const comumCount = catalog.filter((d) => d.rarity === "padrao" || d.rarity === "comum").length;
    const raroCount = catalog.filter((d) => d.rarity === "raro").length;
    const epicoCount = catalog.filter((d) => d.rarity === "epico").length;
    const lendarioCount = catalog.filter((d) => d.rarity === "lendario").length;
    const miticoCount = catalog.filter((d) => d.rarity === "mitico").length;
    const ownedCount = catalog.filter((d) => d.isUnlocked).length;

    if (elements.countAll) elements.countAll.textContent = catalog.length;
    if (elements.countComum) elements.countComum.textContent = comumCount;
    if (elements.countRaro) elements.countRaro.textContent = raroCount;
    if (elements.countEpico) elements.countEpico.textContent = epicoCount;
    if (elements.countLendario) elements.countLendario.textContent = lendarioCount;
    if (elements.countMitico) elements.countMitico.textContent = miticoCount;
    if (elements.countOwned) elements.countOwned.textContent = ownedCount;
}

/* ------------------------------------------------------------
   FILTRAGEM DO CATÁLOGO
   ------------------------------------------------------------ */
function getFilteredCatalog() {
    const catalog = avatarService.getCatalog();
    let filtered;
    switch (currentFilter) {
        case "comum":
            filtered = catalog.filter((d) => d.rarity === "padrao" || d.rarity === "comum");
            break;
        case "raro":
            filtered = catalog.filter((d) => d.rarity === "raro");
            break;
        case "epico":
            filtered = catalog.filter((d) => d.rarity === "epico");
            break;
        case "lendario":
            filtered = catalog.filter((d) => d.rarity === "lendario");
            break;
        case "mitico":
            filtered = catalog.filter((d) => d.rarity === "mitico");
            break;
        case "owned":
            filtered = catalog.filter((d) => d.isUnlocked);
            break;
        default:
            filtered = catalog;
    }

    const query = elements.search?.value.trim().toLocaleLowerCase("pt-BR") || "";
    if (query) {
        filtered = filtered.filter((dino) =>
            [dino.name, dino.title, dino.description, dino.rarityLabel]
                .filter(Boolean)
                .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(query)),
        );
    }

    const sortBy = elements.sort?.value || "price-asc";
    const sorted = [...filtered];
    if (sortBy === "price-desc") {
        sorted.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name, "pt-BR"));
    } else if (sortBy === "name") {
        sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    } else if (sortBy === "rarity") {
        sorted.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99)
            || a.price - b.price);
    } else {
        sorted.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, "pt-BR"));
    }
    return sorted;
}

/* ------------------------------------------------------------
   RENDERIZAÇÃO DOS CARDS
   ------------------------------------------------------------ */
function renderDinoGrid() {
    renderHeaderStats();

    const dinos = getFilteredCatalog();
    const currentXp = avatarService.getXp();

    elements.dinoGrid.innerHTML = "";
    if (elements.resultCount) {
        elements.resultCount.textContent = `${dinos.length} ${dinos.length === 1 ? "skin" : "skins"}`;
    }

    if (dinos.length === 0) {
        elements.dinoGrid.innerHTML = `
            <div class="store-empty-state">
                <i class="fi fi-br-backpack" aria-hidden="true"></i>
                <h3>Nenhuma skin encontrada</h3>
                <p>Altere a busca ou escolha outra categoria para ver mais opções.</p>
                ${elements.search?.value ? '<button class="store-clear-search" type="button" data-action="clear-search">Limpar busca</button>' : ""}
            </div>
        `;
        return;
    }

    dinos.forEach((dino) => {
        const card = document.createElement("article");
        card.className = `dino-card ${dino.isEquipped ? "is-equipped" : ""}`;
        card.dataset.rarity = dino.rarity;
        card.dataset.dinoId = dino.id;

        const imgPath = avatarService.resolveImagePath(dino);

        const header = document.createElement("div");
        header.className = "dino-card__header";

        const rarityBadge = document.createElement("span");
        rarityBadge.className = "dino-card__rarity";
        let rarityIcon = "fi-br-star";
        if (dino.rarity === "raro") rarityIcon = "fi-br-diamond";
        if (dino.rarity === "epico") rarityIcon = "fi-br-flame";
        if (dino.rarity === "lendario") rarityIcon = "fi-br-crown";
        if (dino.rarity === "mitico") rarityIcon = "fi-br-sparkles";

        rarityBadge.innerHTML = `<i class="fi ${rarityIcon}"></i> ${dino.rarityLabel}`;

        const pricePill = document.createElement("span");
        pricePill.className = `dino-card__price-pill ${dino.price === 0 ? "is-free" : ""}`;
        if (dino.price === 0) {
            pricePill.innerHTML = `<i class="fi fi-br-check-circle"></i> Grátis`;
        } else {
            pricePill.innerHTML = `<i class="fi fi-br-star"></i> ${dino.price.toLocaleString("pt-BR")} XP`;
        }

        header.appendChild(rarityBadge);
        header.appendChild(pricePill);

        const visual = document.createElement("div");
        visual.className = "dino-card__visual";

        const visualBg = document.createElement("div");
        visualBg.className = "dino-card__visual-bg";

        const img = document.createElement("img");
        img.className = "dino-card__img";
        img.src = imgPath;
        img.alt = dino.name;
        img.loading = "lazy";

        visual.appendChild(visualBg);
        visual.appendChild(img);

        const info = document.createElement("div");
        info.className = "dino-card__info";
        info.innerHTML = `
            <h3 class="dino-card__name">${dino.name}</h3>
            <p class="dino-card__title">${dino.title}</p>
            <p class="dino-card__desc">${dino.description}</p>
        `;

        const actionWrap = document.createElement("div");
        actionWrap.className = "dino-card__action";

        const btn = document.createElement("button");
        btn.type = "button";

        if (dino.isEquipped) {
            btn.className = "dino-btn dino-btn--equipped";
            btn.innerHTML = `<i class="fi fi-br-check"></i> Mascote Ativo`;
            btn.disabled = true;
        } else if (dino.isUnlocked) {
            btn.className = "dino-btn dino-btn--equip";
            btn.innerHTML = `<i class="fi fi-br-refresh"></i> Equipar`;
            btn.addEventListener("click", () => handleEquip(dino));
        } else {
            const canAfford = currentXp >= dino.price;
            if (canAfford) {
                btn.className = "dino-btn dino-btn--buy";
                btn.innerHTML = dino.price === 0
                    ? `<i class="fi fi-br-gift"></i> Adotar grátis`
                    : `<i class="fi fi-br-shopping-cart"></i> Adotar (${dino.price} XP)`;
                btn.addEventListener("click", () => openPurchaseModal(dino));
            } else {
                const diff = dino.price - currentXp;
                btn.className = "dino-btn dino-btn--locked";
                btn.innerHTML = `<i class="fi fi-br-lock"></i> Faltam ${diff.toLocaleString("pt-BR")} XP`;
                btn.title = `Você precisa de mais ${diff.toLocaleString("pt-BR")} XP para adotar este dino. Continue fazendo atividades!`;
                btn.addEventListener("click", () => {
                    showToast(`Faltam ${diff.toLocaleString("pt-BR")} XP para adotar o ${dino.name}! Continue aprendendo nas atividades!`, "warning");
                });
            }
        }

        actionWrap.appendChild(btn);

        card.appendChild(header);
        card.appendChild(visual);
        card.appendChild(info);
        card.appendChild(actionWrap);

        elements.dinoGrid.appendChild(card);
    });
}

/* ------------------------------------------------------------
   AÇÃO DE EQUIPAR
   ------------------------------------------------------------ */
async function handleEquip(dino) {
    try {
        await avatarService.equipDino(dino.id);
        playSound("success");
        showToast(`Mascote alterado para ${dino.name}!`, "success");
        renderDinoGrid();
    } catch (e) {
        showToast(e.message || "Erro ao equipar dino.", "error");
    }
}

/* ------------------------------------------------------------
   MODAL DE COMPRA
   ------------------------------------------------------------ */
function openPurchaseModal(dino) {
    pendingPurchaseDino = dino;
    const currentXp = avatarService.getXp();
    const remaining = currentXp - dino.price;

    elements.modalDinoImg.src = avatarService.resolveImagePath(dino);
    elements.modalDinoImg.alt = dino.name;
    elements.modalDinoName.textContent = dino.name;

    elements.modalXpCurrent.textContent = `${currentXp.toLocaleString("pt-BR")} XP`;
    elements.modalXpCost.textContent = dino.price === 0
        ? "Grátis"
        : `- ${dino.price.toLocaleString("pt-BR")} XP`;
    elements.modalXpRemaining.textContent = `${remaining.toLocaleString("pt-BR")} XP`;

    if (elements.modalBackdrop) {
        elements.modalBackdrop.inert = false;
        elements.modalBackdrop.classList.add("is-open");
        elements.modalBackdrop.setAttribute("aria-hidden", "false");
    }
    elements.modalConfirmBtn?.focus();
}

function closePurchaseModal() {
    pendingPurchaseDino = null;

    if (document.activeElement && elements.modalBackdrop?.contains(document.activeElement)) {
        document.activeElement.blur();
    }

    if (elements.modalBackdrop) {
        elements.modalBackdrop.classList.remove("is-open");
        elements.modalBackdrop.setAttribute("aria-hidden", "true");
        elements.modalBackdrop.inert = true;
    }
}

async function handleConfirmPurchase() {
    if (!pendingPurchaseDino) return;
    const dino = pendingPurchaseDino;

    try {
        elements.modalConfirmBtn.disabled = true;
        elements.modalConfirmBtn.innerHTML = '<i class="fi fi-br-spinner"></i> Adotando...';

        await avatarService.buyDino(dino.id);
        closePurchaseModal();

        playSound("celebration");
        launchConfetti();
        showToast(`🎉 Incrível! Você adotou o ${dino.name}! Ele já está equipado em toda a plataforma.`, "success");

        renderDinoGrid();
    } catch (e) {
        showToast(e.message || "Não foi possível concluir a compra.", "error");
    } finally {
        if (elements.modalConfirmBtn) {
            elements.modalConfirmBtn.disabled = false;
            elements.modalConfirmBtn.innerHTML = '<i class="fi fi-br-shopping-cart"></i> Comprar e equipar';
        }
    }
}

/* ------------------------------------------------------------
   TREINO RÁPIDO (+200 XP PARA TESTES E DEMONSTRAÇÃO)
   ------------------------------------------------------------ */
function handleTreinoXp() {
    const added = 200;
    avatarService.addXp(added);
    playSound("success");
    showToast(`⚡ Parabéns! Você completou um treino relâmpago e ganhou +${added} XP!`, "success");
    renderDinoGrid();
}

/* ------------------------------------------------------------
   REGISTRO DE EVENTOS
   ------------------------------------------------------------ */
function registerEvents() {
    elements.tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            elements.tabs.forEach((t) => {
                t.classList.remove("active");
                t.setAttribute("aria-selected", "false");
            });
            tab.classList.add("active");
            tab.setAttribute("aria-selected", "true");
            currentFilter = tab.dataset.filter || "all";
            renderDinoGrid();
        });
    });

    elements.search?.addEventListener("input", renderDinoGrid);
    elements.sort?.addEventListener("change", renderDinoGrid);
    const sortContainer = elements.sort?.closest(".store-sort");

    sortContainer?.addEventListener("click", (event) => {
        // O próprio select já abre a lista pelo comportamento normal do navegador.
        if (event.target === elements.sort) return;

        // Impede o label de enviar um segundo clique ao select.
        event.preventDefault();

        if (typeof elements.sort.showPicker === "function") {
            elements.sort.showPicker();
        } else {
            elements.sort.focus();
        }
    });
    elements.dinoGrid?.addEventListener("click", (event) => {
        if (event.target.closest('[data-action="clear-search"]')) {
            elements.search.value = "";
            elements.search.focus();
            renderDinoGrid();
        }
    });
    elements.btnTreinoXp?.addEventListener("click", handleTreinoXp);

    elements.modalCloseBtn?.addEventListener("click", closePurchaseModal);
    elements.modalCancelBtn?.addEventListener("click", closePurchaseModal);
    elements.modalConfirmBtn?.addEventListener("click", handleConfirmPurchase);

    elements.modalBackdrop?.addEventListener("click", (e) => {
        if (e.target === elements.modalBackdrop) {
            closePurchaseModal();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && elements.modalBackdrop?.classList.contains("is-open")) {
            closePurchaseModal();
        }
    });

    window.addEventListener("roar-avatar-changed", () => {
        renderDinoGrid();
    });

    window.addEventListener("roar-xp-changed", () => {
        renderDinoGrid();
    });
}

/* ------------------------------------------------------------
   INICIALIZAÇÃO
   ------------------------------------------------------------ */
/* ------------------------------------------------------------
   INICIALIZAÇÃO DA LOJA
   ------------------------------------------------------------ */
function initialize() {
    renderDinoGrid();
    registerEvents();
}

initialize();
