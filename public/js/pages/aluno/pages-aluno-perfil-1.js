import { showToast } from "../../components/toast.js";
import { perfilAlunoService } from "../../services/perfil-aluno-service.js";
import { sessionService } from "../../services/session-service.js";
import { avatarService } from "../../services/avatar-service.js?v=2";
import { moduloService } from "../../services/modulo-service.js";

const elements = {
    navbarAvatar:
        document.getElementById("navbarAvatar"),

    profileAvatar:
        document.getElementById("profileAvatar"),

    studentName:
        document.getElementById("studentName"),

    studentSchoolYear:
        document.getElementById("studentSchoolYear"),

    studentEmail:
        document.getElementById("studentEmail"),

    studentLearningMode:
        document.getElementById("studentLearningMode"),

    studentXp:
        document.getElementById("studentXp"),

    completedModulesSummary:
        document.getElementById("completedModulesSummary"),

    nextModuleSummary:
        document.getElementById("nextModuleSummary"),

    studentLearningModeDetail:
        document.getElementById(
            "studentLearningModeDetail",
        ),

    studentXpDetail:
        document.getElementById("studentXpDetail"),

    profileStatus:
        document.getElementById("profileStatus"),
};


function validateElements() {
    const missingElements =
        Object.entries(elements)
            .filter(([, element]) => !element)
            .map(([name]) => name);

    if (missingElements.length) {
        throw new Error(
            `Elementos ausentes no perfil: ${missingElements.join(", ")}.`,
        );
    }
}


function formatNumber(value) {
    return Number(value ?? 0)
        .toLocaleString("pt-BR");
}


function setLoading() {
    elements.studentName.textContent =
        "Carregando perfil...";

    elements.studentSchoolYear.textContent =
        "Ano escolar: —";

    elements.studentEmail.textContent =
        "E-mail: —";

    elements.studentLearningMode.textContent =
        "Carregando...";

    elements.profileStatus.textContent =
        "Carregando suas informações...";
}


function renderProfile(profile) {
    if (window.ROAR_SYNC_AVATAR) {
        window.ROAR_SYNC_AVATAR();
    } else {
        elements.navbarAvatar.textContent =
            profile.initials;

        elements.profileAvatar.textContent =
            profile.initials;
    }

    elements.navbarAvatar.title =
        profile.name;

    elements.studentName.textContent =
        profile.name;

    elements.studentSchoolYear.textContent =
        `Ano escolar: ${profile.schoolYear}`;

    elements.studentEmail.textContent =
        `E-mail: ${profile.email}`;

    elements.studentLearningMode.textContent =
        profile.learningMode.label;

    const currentXp = window.ROARAvatar ? window.ROARAvatar.getXp() : profile.xp;
    elements.studentXp.textContent =
        formatNumber(currentXp);

    elements.studentLearningModeDetail.textContent =
        profile.learningMode.name;

    elements.studentXpDetail.textContent =
        `${formatNumber(currentXp)} XP`;

    elements.profileStatus.textContent =
        "Suas informações estão atualizadas.";

    if (window.ROAR_SYNC_AVATAR) {
        window.ROAR_SYNC_AVATAR();
    }

    // ATUALIZA A IMAGEM DO MASCOTE NA TELA DE PERFIL
    if (avatarService) {
        avatarService.applyToPage();
    }
}

async function renderJourney() {
    try {
        const modules = await moduloService.listJourney();
        const availableModules = modules.filter(
            module => module.active && module.status !== "preparation",
        );

        const completedModules = availableModules.filter(
            module => module.status === "completed",
        );

        const currentModule =
            availableModules.find(module => module.status === "in_progress") ??
            availableModules.find(module => module.status === "available");

        elements.completedModulesSummary.textContent =
            `${completedModules.length} de ${availableModules.length} módulos`;

        if (currentModule?.status === "in_progress") {
            elements.nextModuleSummary.textContent =
                `${currentModule.title} — ${currentModule.progress}% concluído`;
        } else if (currentModule) {
            elements.nextModuleSummary.textContent =
                `${currentModule.title} — pronto para começar`;
        } else if (completedModules.length > 0) {
            elements.nextModuleSummary.textContent =
                "Você pode revisar um módulo concluído";
        } else {
            elements.nextModuleSummary.textContent =
                "Nenhum módulo disponível no momento";
        }
    } catch (error) {
        console.error("Erro ao carregar a jornada do aluno:", error);

        elements.completedModulesSummary.textContent =
            "Progresso indisponível";

        elements.nextModuleSummary.textContent =
            "Acesse meus módulos para continuar";
    }
}


function updateSession(profile) {
    const currentSession =
        sessionService.get();

    if (!currentSession) {
        return;
    }

    const currentUser =
        currentSession.user ?? {};

    sessionService.start({
        ...currentSession,

        user: {
            ...currentUser,

            id:
                currentUser.id ??
                profile.id,

            name: profile.name,
            nome: profile.name,
            email: profile.email,

            schoolYear:
                profile.schoolYear,

            supportLevel:
                profile.learningMode.label,

            xpTotal:
                profile.xp,
        },
    });
}


function renderError(error) {
    console.error(
        "Erro ao carregar perfil do aluno:",
        error,
    );

    elements.studentName.textContent =
        "Perfil indisponível";

    elements.studentLearningMode.textContent =
        "Não foi possível carregar";

    elements.profileStatus.textContent =
        error?.message ??
        "Não foi possível carregar suas informações.";

    showToast(
        error?.message ??
        "Não foi possível carregar o perfil.",
        "error",
    );
}


async function loadProfile() {
    setLoading();

    try {
        const profile =
            await perfilAlunoService
                .getCurrentStudent();

        renderProfile(profile);
        updateSession(profile);
    } catch (error) {
        renderError(error);
    }
}


async function initialize() {
    try {
        validateElements();
        await loadProfile();
        await renderJourney();
    } catch (error) {
        console.error(
            "Erro ao inicializar perfil:",
            error,
        );

        showToast(
            error?.message ??
            "Não foi possível inicializar o perfil.",
            "error",
        );
    }
}


initialize();