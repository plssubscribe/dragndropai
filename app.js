const themes = [
  {
    id: "iris",
    name: "Iris Bloom",
    gradient: "linear-gradient(140deg, #111121 0%, #2d1b4e 40%, #43327a 100%)",
    accent: "#7c3aed",
    accentHover: "#6d28d9",
    text: "#f5f3ff",
    muted: "rgba(229, 231, 235, 0.75)",
    buttonText: "#f5f3ff",
  },
  {
    id: "sunrise",
    name: "Sunrise Punch",
    gradient: "linear-gradient(150deg, #2c1810 0%, #46160e 45%, #7b2814 100%)",
    accent: "#f97316",
    accentHover: "#ea580c",
    text: "#fff7ed",
    muted: "rgba(254, 215, 170, 0.82)",
    buttonText: "#fff7ed",
  },
  {
    id: "lagoon",
    name: "Lagoon Waves",
    gradient: "linear-gradient(150deg, #081c24 0%, #0a2c33 45%, #0f4d4d 100%)",
    accent: "#06b6d4",
    accentHover: "#0891b2",
    text: "#ecfeff",
    muted: "rgba(165, 243, 252, 0.78)",
    buttonText: "#ecfeff",
  },
  {
    id: "neutral",
    name: "Ivory Canvas",
    gradient: "linear-gradient(155deg, #f5f7fb 0%, #edf2fa 45%, #dfe7f3 100%)",
    accent: "#0f172a",
    accentHover: "#1e293b",
    text: "#0f172a",
    muted: "rgba(51, 65, 85, 0.7)",
    buttonText: "#f8fafc",
  },
];

const defaultLinks = [
  {
    id: "link-1",
    label: "Portfolio",
    url: "https://avery.design",
    active: true,
  },
  {
    id: "link-2",
    label: "Dribbble",
    url: "https://dribbble.com/avery",
    active: true,
  },
  {
    id: "link-3",
    label: "Speaking",
    url: "https://cal.com/avery",
    active: true,
  },
];

const state = {
  profile: {
    name: "Avery Patel",
    handle: "@averydesigns",
    bio: "Designing delightful product experiences at Northwind. Speaker, mentor, coffee nerd.",
    avatarUrl:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=facearea&facepad=3&w=256&h=256&q=80",
  },
  links: defaultLinks.map((link) => ({ ...link })),
  activeThemeId: themes[0].id,
  newLink: { label: "", url: "" },
};

const appRoot = document.getElementById("app");

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const escapeSelector = (value = "") =>
  String(value).replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");

const rerenderPreservingFocus = (activeElement) => {
  if (!activeElement) {
    render();
    return;
  }

  const isTextField =
    activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
  const selectionStart = isTextField ? activeElement.selectionStart : null;
  const selectionEnd = isTextField ? activeElement.selectionEnd : null;

  let selector = null;
  if (activeElement.id) {
    selector = `#${escapeSelector(activeElement.id)}`;
  } else if (activeElement.hasAttribute("data-link-input")) {
    const id = activeElement.getAttribute("data-link-input");
    const field = activeElement.getAttribute("data-field");
    selector = `[data-link-input="${escapeSelector(id)}"][data-field="${escapeSelector(field)}"]`;
  } else if (activeElement.hasAttribute("data-profile-field")) {
    const field = activeElement.getAttribute("data-profile-field");
    selector = `[data-profile-field="${escapeSelector(field)}"]`;
  }

  render();

  if (selector) {
    const next = document.querySelector(selector);
    if (next) {
      next.focus();
      if (
        selectionStart !== null &&
        selectionEnd !== null &&
        typeof next.setSelectionRange === "function"
      ) {
        next.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }
};

const getTheme = () => themes.find((theme) => theme.id === state.activeThemeId) ?? themes[0];

const render = () => {
  const theme = getTheme();
  const activeLinks = state.links.filter((link) => link.active);
  const isAddDisabled = !state.newLink.label.trim() || !state.newLink.url.trim();

  appRoot.innerHTML = `
    <div class="app-shell">
      <section class="control-panel">
        <article class="panel" aria-labelledby="profile-settings">
          <h2 id="profile-settings">Profile</h2>
          <div class="profile-header">
            <div class="avatar-preview">
              <img src="${escapeHtml(state.profile.avatarUrl)}" alt="Profile avatar preview" />
            </div>
            <p class="helper-text">
              Keep your bio short and focused. Freshen it up with what you're working on this week.
            </p>
          </div>
          <div class="field-group">
            <label for="profile-name">Display name</label>
            <input id="profile-name" data-profile-field="name" value="${escapeHtml(state.profile.name)}" placeholder="Your name" />
          </div>
          <div class="field-group">
            <label for="profile-handle">Handle</label>
            <input id="profile-handle" data-profile-field="handle" value="${escapeHtml(state.profile.handle)}" placeholder="@you" />
          </div>
          <div class="field-group">
            <label for="profile-bio">Bio</label>
            <textarea id="profile-bio" rows="3" data-profile-field="bio" placeholder="Tell visitors what you're about">${escapeHtml(state.profile.bio)}</textarea>
          </div>
          <div class="field-group">
            <label for="profile-avatar">Avatar URL</label>
            <input id="profile-avatar" data-profile-field="avatarUrl" value="${escapeHtml(state.profile.avatarUrl)}" placeholder="https://" />
          </div>
        </article>

        <article class="panel" aria-labelledby="theme-picker">
          <h2 id="theme-picker">Themes</h2>
          <div class="theme-grid">
            ${themes
              .map(
                (themeOption) => `
                  <button type="button" class="theme-swatch ${
                    themeOption.id === state.activeThemeId ? "selected" : ""
                  }" data-theme="${themeOption.id}" aria-pressed="${
    themeOption.id === state.activeThemeId
  }" aria-label="Select ${escapeHtml(themeOption.name)} theme" style="background:${themeOption.gradient}; color:${
    themeOption.text
  };">
                    <div class="swatch-overlay">
                      <span>${escapeHtml(themeOption.name)}</span>
                    </div>
                  </button>
                `
              )
              .join("")}
          </div>
        </article>

        <article class="panel" aria-labelledby="link-manager">
          <h2 id="link-manager">Links</h2>
          <form id="new-link-form" class="new-link">
            <input type="text" name="label" data-new-link-field="label" placeholder="Label" value="${escapeHtml(
              state.newLink.label
            )}" />
            <input type="url" name="url" data-new-link-field="url" placeholder="https://" value="${escapeHtml(
              state.newLink.url
            )}" />
            <button type="submit" class="primary-button" style="--button-accent:${theme.accent}; --button-accent-hover:${
    theme.accentHover
  }; --button-text:${theme.buttonText};" ${isAddDisabled ? "disabled" : ""}>Add link</button>
            <p class="helper-text">Reorder your cards and toggle their visibility. The preview updates instantly.</p>
          </form>

          <div class="link-stack">
            ${
              state.links.length
                ? state.links
                    .map((link, index) => `
                      <section class="link-card" data-link-id="${link.id}">
                        <div class="link-card-header">
                          <label class="switch">
                            <input type="checkbox" ${link.active ? "checked" : ""} data-link-toggle="${link.id}" />
                            <span>${link.active ? "Visible" : "Hidden"}</span>
                          </label>
                          <div class="link-card-actions">
                            <button class="icon-button" type="button" data-move="up" data-link="${link.id}" aria-label="Move up" ${
                              index === 0 ? 'disabled aria-disabled="true"' : ''
                            }>↑</button>
                            <button class="icon-button" type="button" data-move="down" data-link="${link.id}" aria-label="Move down" ${
                              index === state.links.length - 1
                                ? 'disabled aria-disabled="true"'
                                : ''
                            }>↓</button>
                            <button class="icon-button" type="button" data-delete-link="${link.id}" aria-label="Delete">
                              ✕
                            </button>
                          </div>
                        </div>
                        <div class="field-group">
                          <label>Link label</label>
                          <input data-link-input="${link.id}" data-field="label" value="${escapeHtml(link.label)}" placeholder="Portfolio" />
                        </div>
                        <div class="field-group">
                          <label>Destination URL</label>
                          <input data-link-input="${link.id}" data-field="url" value="${escapeHtml(link.url)}" placeholder="https://" />
                        </div>
                      </section>
                    `)
                    .join("")
                : `<p class="helper-text">You haven't added any links yet. Start with your portfolio or newest project.</p>`
            }
          </div>
        </article>
      </section>

      <aside class="preview-panel">
        <div class="preview-shell">
          <div class="preview-card" style="--gradient:${theme.gradient}; --accent:${theme.accent}; --text:${
    theme.text
  }; --muted:${theme.muted};">
            <div class="preview-avatar">
              <img src="${escapeHtml(state.profile.avatarUrl)}" alt="${escapeHtml(state.profile.name)} avatar" />
            </div>
            <div>
              <p class="preview-handle">${escapeHtml(state.profile.handle)}</p>
              <h1 class="preview-name">${escapeHtml(state.profile.name)}</h1>
              <p class="preview-bio">${escapeHtml(state.profile.bio)}</p>
            </div>
            <div class="preview-links">
              ${
                activeLinks.length
                  ? activeLinks
                      .map(
                        (link) => `
                          <a class="preview-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">
                            <span>${escapeHtml(link.label)}</span>
                            <span class="link-arrow">↗</span>
                          </a>
                        `
                      )
                      .join("")
                  : `<div class="preview-empty">Add a link to see it appear here instantly.</div>`
              }
            </div>
            <div class="share-cta">
              <button class="share-button" type="button">Copy share link</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `;

  wireEvents();
};

const updateProfile = (field, value, sourceElement) => {
  state.profile[field] = value;
  rerenderPreservingFocus(sourceElement);
};

const updateNewLinkField = (field, value) => {
  state.newLink[field] = value;
};

const addLink = () => {
  const label = state.newLink.label.trim();
  const url = state.newLink.url.trim();

  if (!label || !url) {
    return;
  }

  state.links = [
    { id: createId(), label, url, active: true },
    ...state.links,
  ];
  state.newLink = { label: "", url: "" };
  render();
};

const updateLinkField = (id, field, value, sourceElement) => {
  state.links = state.links.map((link) =>
    link.id === id ? { ...link, [field]: value } : link
  );
  rerenderPreservingFocus(sourceElement);
};

const toggleLink = (id, checked, sourceElement) => {
  state.links = state.links.map((link) =>
    link.id === id ? { ...link, active: checked } : link
  );
  rerenderPreservingFocus(sourceElement);
};

const removeLink = (id) => {
  state.links = state.links.filter((link) => link.id !== id);
  render();
};

const moveLink = (id, direction) => {
  const index = state.links.findIndex((link) => link.id === id);
  if (index === -1) return;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= state.links.length) return;

  const newOrder = [...state.links];
  const [item] = newOrder.splice(index, 1);
  newOrder.splice(targetIndex, 0, item);
  state.links = newOrder;
  render();
};

const wireEvents = () => {
  document.querySelectorAll("[data-profile-field]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const field = event.target.getAttribute("data-profile-field");
      updateProfile(field, event.target.value, event.target);
    });
  });

  document.querySelectorAll("[data-theme]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const themeId = event.currentTarget.getAttribute("data-theme");
      state.activeThemeId = themeId;
      render();
    });
  });

  const newLinkForm = document.getElementById("new-link-form");
  if (newLinkForm) {
    const refreshAddButton = () => {
      const addButton = newLinkForm.querySelector('.primary-button');
      if (addButton) {
        const shouldDisable = !state.newLink.label.trim() || !state.newLink.url.trim();
        addButton.disabled = shouldDisable;
      }
    };

    newLinkForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addLink();
    });

    newLinkForm.querySelectorAll("[data-new-link-field]").forEach((input) => {
      input.addEventListener("input", (event) => {
        const field = event.target.getAttribute("data-new-link-field");
        updateNewLinkField(field, event.target.value);
        refreshAddButton();
      });
    });

    refreshAddButton();
  }

  document.querySelectorAll("[data-link-input]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const linkId = event.target.getAttribute("data-link-input");
      const field = event.target.getAttribute("data-field");
      updateLinkField(linkId, field, event.target.value, event.target);
    });
  });

  document.querySelectorAll("[data-link-toggle]").forEach((toggle) => {
    toggle.addEventListener("change", (event) => {
      const linkId = event.target.getAttribute("data-link-toggle");
      toggleLink(linkId, event.target.checked, event.target);
    });
  });

  document.querySelectorAll("[data-delete-link]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.currentTarget.getAttribute("data-delete-link");
      removeLink(id);
    });
  });

  document.querySelectorAll("[data-move]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const direction = event.currentTarget.getAttribute("data-move");
      const id = event.currentTarget.getAttribute("data-link");
      moveLink(id, direction);
    });
  });

  const shareButton = document.querySelector(".share-button");
  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      const cleanedHandle = state.profile.handle.replace(/^@+/, "").trim();
      const shareHandle = cleanedHandle || "yourname";
      const shareUrl = `https://linkhub.to/${shareHandle}`;

      const setLabel = (text) => {
        shareButton.textContent = text;
        if (shareButton._resetTimeout) {
          clearTimeout(shareButton._resetTimeout);
        }
        shareButton._resetTimeout = setTimeout(() => {
          if (document.body.contains(shareButton)) {
            shareButton.textContent = "Copy share link";
          }
        }, 2000);
      };

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = shareUrl;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        setLabel("Link copied!");
      } catch (error) {
        console.error("Unable to copy share link", error);
        setLabel("Copy failed");
      }
    });
  }
};

render();
