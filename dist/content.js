"use strict";
(() => {
  // src/content/scanner.ts
  var FIELD_SELECTOR = [
    'input:not([type="hidden"])',
    "textarea",
    "select",
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="radio"]',
    '[role="checkbox"]'
  ].join(",");
  var cleanText = (text) => (text ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
  function getRoots(root = document) {
    const roots = [root];
    root.querySelectorAll("*").forEach((element) => {
      if (element.shadowRoot) roots.push(...getRoots(element.shadowRoot));
    });
    return roots;
  }
  function cssEscape(value) {
    return globalThis.CSS?.escape?.(value) ?? value.replace(/["\\#.:()[\] >+~]/g, "\\$&");
  }
  function labelText(element) {
    const input = element;
    if (input.labels?.length) return cleanText([...input.labels].map((label) => label.textContent).join(" "));
    const wrappingLabel = element.closest("label");
    if (wrappingLabel) return cleanText(wrappingLabel.textContent);
    const id = element.id;
    if (id) {
      const root = element.getRootNode();
      const explicit = [...root.querySelectorAll("label")].find((label) => label.htmlFor === id);
      if (explicit) return cleanText(explicit.textContent);
    }
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      return cleanText(labelledBy.split(/\s+/).map((ref) => document.getElementById(ref)?.textContent).join(" "));
    }
    return "";
  }
  function nearbyText(element) {
    const pieces = [];
    let sibling = element.previousElementSibling;
    for (let count = 0; sibling && count < 2; count += 1, sibling = sibling.previousElementSibling) {
      pieces.unshift(cleanText(sibling.textContent));
    }
    sibling = element.nextElementSibling;
    if (sibling) pieces.push(cleanText(sibling.textContent));
    return cleanText(pieces.filter(Boolean).join(" "));
  }
  function strippedContainerText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll(FIELD_SELECTOR).forEach((field) => field.remove());
    return cleanText(clone.textContent);
  }
  function parentText(element) {
    return element.parentElement ? strippedContainerText(element.parentElement) : "";
  }
  function sectionText(element) {
    const section = element.closest("section, fieldset, form, article, [data-section], .section, .form-section");
    if (section) return strippedContainerText(section);
    let current = element.parentElement;
    for (let depth = 0; current && depth < 3; depth += 1, current = current.parentElement) {
      const text = strippedContainerText(current);
      if (text.length > 8) return text;
    }
    return "";
  }
  function selectorCandidates(element) {
    const candidates = [];
    const tag = element.tagName.toLowerCase();
    if (element.id) candidates.push(`${tag}#${cssEscape(element.id)}`);
    const name = element.getAttribute("name");
    if (name) candidates.push(`${tag}[name="${cssEscape(name)}"]`);
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) candidates.push(`${tag}[aria-label="${cssEscape(ariaLabel)}"]`);
    const placeholder = element.getAttribute("placeholder");
    if (placeholder) candidates.push(`${tag}[placeholder="${cssEscape(placeholder)}"]`);
    const autocomplete = element.getAttribute("autocomplete");
    if (autocomplete) candidates.push(`${tag}[autocomplete="${cssEscape(autocomplete)}"]`);
    const dataId = ensureElementId(element);
    candidates.push(`[data-resumeflow-id="${cssEscape(dataId)}"]`);
    return [...new Set(candidates)].slice(0, 8);
  }
  function editableType(element) {
    if (element instanceof HTMLTextAreaElement) return "textarea";
    if (element instanceof HTMLSelectElement) return "select";
    if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) return "checkable";
    if (element instanceof HTMLInputElement) return "input";
    if (element.isContentEditable) return "contenteditable";
    if (element.getAttribute("role") === "textbox") return "aria-textbox";
    return "unknown";
  }
  function isVisible(element) {
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && rect.width >= 0 && rect.height >= 0;
  }
  var nextId = 1;
  function isEditableField(element) {
    return element instanceof HTMLElement && element.matches(FIELD_SELECTOR);
  }
  function getFieldElements() {
    const unique = /* @__PURE__ */ new Set();
    for (const root of getRoots()) {
      root.querySelectorAll(FIELD_SELECTOR).forEach((element) => unique.add(element));
    }
    return [...unique];
  }
  function ensureElementId(element) {
    const existing = element.dataset.resumeflowId;
    if (existing) return existing;
    const id = `rf-${Date.now().toString(36)}-${nextId++}`;
    element.dataset.resumeflowId = id;
    return id;
  }
  function describeField(element) {
    const control = element;
    const label = labelText(element);
    return {
      elementId: ensureElementId(element),
      tagName: element.tagName.toLowerCase(),
      type: "type" in control ? control.type?.toLowerCase() : element.getAttribute("role") ?? void 0,
      label: label || void 0,
      labelText: label || void 0,
      placeholder: element.getAttribute("placeholder") ?? void 0,
      name: element.getAttribute("name") ?? void 0,
      id: element.id || void 0,
      ariaLabel: element.getAttribute("aria-label") ?? void 0,
      autocomplete: element.getAttribute("autocomplete") ?? void 0,
      nearbyText: nearbyText(element) || void 0,
      parentText: parentText(element) || void 0,
      sectionText: sectionText(element) || void 0,
      editableType: editableType(element),
      selectorCandidates: selectorCandidates(element),
      options: element instanceof HTMLSelectElement ? [...element.options].map((option) => ({ value: option.value, label: cleanText(option.textContent) })) : void 0,
      isVisible: isVisible(element),
      isDisabled: "disabled" in control ? Boolean(control.disabled) : element.getAttribute("aria-disabled") === "true",
      isReadOnly: "readOnly" in control ? Boolean(control.readOnly) : false
    };
  }
  function scanPage() {
    return getFieldElements().map(describeField).filter((field) => field.isVisible && !field.isDisabled && !field.isReadOnly);
  }
  function findFieldElement(elementId) {
    for (const root of getRoots()) {
      const safeId = elementId.replace(/["\\]/g, "\\$&");
      const result = root.querySelector(`[data-resumeflow-id="${safeId}"]`);
      if (result) return result;
    }
    return null;
  }
  function detectRepeatGroups(fields = scanPage()) {
    const groups = /* @__PURE__ */ new Map();
    for (const field of fields) {
      const key = (field.sectionText || field.parentText || "").slice(0, 80);
      if (!key) continue;
      const label = field.labelText || field.placeholder || field.name || field.id;
      if (!label) continue;
      const list = groups.get(key) ?? [];
      list.push(field);
      groups.set(key, list);
    }
    const patternGroups = /* @__PURE__ */ new Map();
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      const pattern = list.map((field) => field.labelText || field.placeholder || field.name || field.id || "").filter(Boolean);
      if (pattern.length < 2) continue;
      const signature = pattern.join(">");
      patternGroups.set(signature, [...patternGroups.get(signature) ?? [], ...list]);
    }
    return [...patternGroups.entries()].filter(([, list]) => list.length >= 4).map(([signature, list], index) => ({
      id: `repeat-${index + 1}`,
      labelPattern: signature.split(">"),
      fieldElementIds: list.map((field) => field.elementId),
      containerSelector: list[0]?.selectorCandidates[0]
    }));
  }

  // src/content/filler.ts
  function dispatchEvents(element, value = "") {
    element.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType: "insertText", data: value }));
    element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    element.dispatchEvent(new FocusEvent("blur", { bubbles: true, composed: true }));
  }
  function setNativeValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
  }
  function normalized(value) {
    return value.toLocaleLowerCase().replace(/[\s\-_]/g, "");
  }
  function setSelectValue(element, value) {
    const target = normalized(value);
    const option = [...element.options].find(
      (item) => normalized(item.value) === target || normalized(item.textContent ?? "") === target || normalized(item.textContent ?? "").includes(target) || target.includes(normalized(item.textContent ?? ""))
    );
    if (!option) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(element, option.value);
    return true;
  }
  function setCheckable(element, value) {
    const label = element.labels?.[0]?.textContent ?? element.value;
    const shouldCheck = normalized(label).includes(normalized(value)) || normalized(element.value) === normalized(value);
    if (!shouldCheck && element.type === "radio") return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
    setter?.call(element, shouldCheck || ["true", "yes", "1", "\u662F"].includes(normalized(value)));
    return true;
  }
  function nextValue(current, value, mode) {
    return mode === "append" && current ? `${current}
${value}` : value;
  }
  function setEditableContent(element, value, mode) {
    const content = nextValue(element.textContent ?? "", value, mode);
    element.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, composed: true, inputType: "insertText", data: value }));
    element.textContent = content;
  }
  function fillElement(element, value, mode = "replace") {
    element.focus({ preventScroll: true });
    if (element instanceof HTMLSelectElement) {
      if (!setSelectValue(element, value)) return false;
    } else if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)) {
      if (!setCheckable(element, value)) return false;
    } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      setNativeValue(element, nextValue(element.value, value, mode));
    } else if (element.isContentEditable || element.getAttribute("role") === "textbox") {
      setEditableContent(element, value, mode);
    } else {
      const control = element;
      if (!("value" in control)) return false;
      control.value = nextValue(String(control.value ?? ""), value, mode);
    }
    dispatchEvents(element, value);
    return true;
  }
  function fillFields(items) {
    let filled = 0;
    let skipped = 0;
    const errors = [];
    for (const item of items) {
      const element = findFieldElement(item.elementId);
      if (!element || !item.value) {
        skipped += 1;
        continue;
      }
      try {
        if (fillElement(element, item.value)) filled += 1;
        else skipped += 1;
      } catch (error) {
        skipped += 1;
        errors.push(error instanceof Error ? error.message : "\u672A\u77E5\u586B\u5145\u9519\u8BEF");
      }
    }
    return { ok: errors.length === 0, filled, skipped, errors };
  }

  // src/matcher/rules.ts
  var MATCH_RULES = [
    { path: "basic.name", label: "\u59D3\u540D", keywords: ["\u59D3\u540D", "\u540D\u5B57", "\u771F\u5B9E\u59D3\u540D", "\u4E2D\u6587\u540D", "full name", "your name", "name"], conflicts: ["\u82F1\u6587", "english", "\u516C\u53F8", "\u9879\u76EE"] },
    { path: "basic.englishName", label: "\u82F1\u6587\u540D", keywords: ["\u82F1\u6587\u540D", "\u82F1\u6587\u59D3\u540D", "english name", "preferred name"], conflicts: ["\u516C\u53F8"] },
    { path: "basic.gender", label: "\u6027\u522B", keywords: ["\u6027\u522B", "gender", "sex"] },
    { path: "basic.birthDate", label: "\u51FA\u751F\u65E5\u671F", keywords: ["\u51FA\u751F\u65E5\u671F", "\u51FA\u751F\u5E74\u6708", "\u751F\u65E5", "date of birth", "birth date", "birthday"], inputTypes: ["date"] },
    { path: "basic.phone", label: "\u8054\u7CFB\u7535\u8BDD", keywords: ["\u8054\u7CFB\u7535\u8BDD", "\u624B\u673A\u53F7\u7801", "\u624B\u673A\u53F7", "\u624B\u673A", "\u7535\u8BDD", "mobile phone", "phone number", "telephone", "mobile", "phone"], inputTypes: ["tel"], autocomplete: ["tel"] },
    { path: "basic.email", label: "\u7535\u5B50\u90AE\u7BB1", keywords: ["\u7535\u5B50\u90AE\u7BB1", "\u90AE\u7BB1\u5730\u5740", "\u90AE\u7BB1", "\u7535\u5B50\u90AE\u4EF6", "email address", "e-mail", "email"], inputTypes: ["email"], autocomplete: ["email"] },
    { path: "basic.city", label: "\u6240\u5728\u57CE\u5E02", keywords: ["\u6240\u5728\u57CE\u5E02", "\u73B0\u5C45\u57CE\u5E02", "\u5F53\u524D\u57CE\u5E02", "\u5C45\u4F4F\u5730", "\u73B0\u5C45\u5730", "current city", "location"], conflicts: ["\u671F\u671B", "\u6C42\u804C", "\u610F\u5411"] },
    { path: "basic.hometown", label: "\u7C4D\u8D2F", keywords: ["\u7C4D\u8D2F", "\u6237\u7C4D\u6240\u5728\u5730", "\u6237\u7C4D", "hometown", "native place"] },
    { path: "basic.targetCity", label: "\u671F\u671B\u57CE\u5E02", keywords: ["\u671F\u671B\u57CE\u5E02", "\u6C42\u804C\u57CE\u5E02", "\u610F\u5411\u57CE\u5E02", "\u5DE5\u4F5C\u5730\u70B9", "\u671F\u671B\u5DE5\u4F5C\u5730", "desired city", "preferred location"] },
    { path: "basic.targetRole", label: "\u6C42\u804C\u5C97\u4F4D", keywords: ["\u6C42\u804C\u5C97\u4F4D", "\u5E94\u8058\u804C\u4F4D", "\u610F\u5411\u5C97\u4F4D", "\u671F\u671B\u804C\u4F4D", "\u76EE\u6807\u5C97\u4F4D", "position applied", "desired position"] },
    { path: "basic.github", label: "GitHub", keywords: ["github", "github \u5730\u5740", "\u4EE3\u7801\u4ED3\u5E93"], inputTypes: ["url"] },
    { path: "basic.website", label: "\u4E2A\u4EBA\u7F51\u7AD9", keywords: ["\u4E2A\u4EBA\u7F51\u7AD9", "\u4E2A\u4EBA\u4E3B\u9875", "\u4F5C\u54C1\u96C6", "portfolio", "personal website", "website"], inputTypes: ["url"], conflicts: ["\u516C\u53F8"] },
    { path: "education.school", label: "\u6BD5\u4E1A\u9662\u6821", keywords: ["\u6BD5\u4E1A\u9662\u6821", "\u5B66\u6821\u540D\u79F0", "\u5C31\u8BFB\u5B66\u6821", "\u5B66\u6821", "\u9AD8\u6821", "\u9662\u6821", "university", "college", "school"], conflicts: ["\u4E2D\u5B66"] },
    { path: "education.degree", label: "\u5B66\u5386", keywords: ["\u6700\u9AD8\u5B66\u5386", "\u5B66\u5386", "\u5B66\u4F4D", "degree", "education level", "qualification"], conflicts: ["\u4E13\u4E1A"] },
    { path: "education.major", label: "\u4E13\u4E1A", keywords: ["\u4E13\u4E1A\u540D\u79F0", "\u6240\u5B66\u4E13\u4E1A", "\u4E3B\u4FEE\u4E13\u4E1A", "\u4E13\u4E1A", "major", "field of study"], conflicts: ["\u6280\u80FD"] },
    { path: "education.startDate", label: "\u5165\u5B66\u65F6\u95F4", keywords: ["\u5165\u5B66\u65F6\u95F4", "\u5165\u5B66\u65E5\u671F", "\u6559\u80B2\u5F00\u59CB\u65F6\u95F4", "start of education", "enrollment date"] },
    { path: "education.endDate", label: "\u6BD5\u4E1A\u65F6\u95F4", keywords: ["\u6BD5\u4E1A\u65F6\u95F4", "\u6BD5\u4E1A\u65E5\u671F", "\u6559\u80B2\u7ED3\u675F\u65F6\u95F4", "graduation date", "graduation year"] },
    { path: "education.gpa", label: "GPA", keywords: ["\u5E73\u5747\u7EE9\u70B9", "\u7EE9\u70B9", "gpa", "grade point"] },
    { path: "education.ranking", label: "\u4E13\u4E1A\u6392\u540D", keywords: ["\u4E13\u4E1A\u6392\u540D", "\u73ED\u7EA7\u6392\u540D", "\u6210\u7EE9\u6392\u540D", "\u6392\u540D", "ranking", "rank"] },
    { path: "education.research", label: "\u7814\u7A76\u65B9\u5411", keywords: ["\u7814\u7A76\u65B9\u5411", "\u7814\u7A76\u9886\u57DF", "research direction", "research area"] },
    { path: "education.description", label: "\u6559\u80B2\u7ECF\u5386\u63CF\u8FF0", keywords: ["\u6559\u80B2\u7ECF\u5386\u63CF\u8FF0", "\u6559\u80B2\u63CF\u8FF0", "\u5728\u6821\u7ECF\u5386", "education description"] },
    { path: "projects.name", label: "\u9879\u76EE\u540D\u79F0", keywords: ["\u9879\u76EE\u540D\u79F0", "\u9879\u76EE\u540D", "project name", "project title"], conflicts: ["\u516C\u53F8"] },
    { path: "projects.role", label: "\u9879\u76EE\u89D2\u8272", keywords: ["\u9879\u76EE\u89D2\u8272", "\u62C5\u4EFB\u89D2\u8272", "project role"] },
    { path: "projects.startDate", label: "\u9879\u76EE\u5F00\u59CB\u65F6\u95F4", keywords: ["\u9879\u76EE\u5F00\u59CB\u65F6\u95F4", "\u9879\u76EE\u8D77\u59CB\u65F6\u95F4", "project start date"] },
    { path: "projects.endDate", label: "\u9879\u76EE\u7ED3\u675F\u65F6\u95F4", keywords: ["\u9879\u76EE\u7ED3\u675F\u65F6\u95F4", "project end date"] },
    { path: "projects.description", label: "\u9879\u76EE\u63CF\u8FF0", keywords: ["\u9879\u76EE\u63CF\u8FF0", "\u9879\u76EE\u4ECB\u7ECD", "\u9879\u76EE\u5185\u5BB9", "project description", "describe project"] },
    { path: "projects.responsibilities", label: "\u4E2A\u4EBA\u804C\u8D23", keywords: ["\u4E2A\u4EBA\u804C\u8D23", "\u9879\u76EE\u804C\u8D23", "\u4E3B\u8981\u804C\u8D23", "responsibilities", "contribution"] },
    { path: "projects.techStack", label: "\u6280\u672F\u6808", keywords: ["\u6280\u672F\u6808", "\u9879\u76EE\u6280\u672F", "\u4F7F\u7528\u6280\u672F", "tech stack", "technologies"] },
    { path: "experience.company", label: "\u516C\u53F8", keywords: ["\u516C\u53F8\u540D\u79F0", "\u5B9E\u4E60\u516C\u53F8", "\u5DE5\u4F5C\u5355\u4F4D", "\u96C7\u4E3B", "company name", "employer", "company"], conflicts: ["\u5B66\u6821"] },
    { path: "experience.department", label: "\u90E8\u95E8", keywords: ["\u6240\u5728\u90E8\u95E8", "\u90E8\u95E8\u540D\u79F0", "\u90E8\u95E8", "department", "division"] },
    { path: "experience.role", label: "\u5DE5\u4F5C\u5C97\u4F4D", keywords: ["\u5DE5\u4F5C\u5C97\u4F4D", "\u5B9E\u4E60\u5C97\u4F4D", "\u804C\u4F4D\u540D\u79F0", "\u804C\u52A1", "job title", "position", "role"], conflicts: ["\u5E94\u8058", "\u671F\u671B"] },
    { path: "experience.startDate", label: "\u5DE5\u4F5C\u5F00\u59CB\u65F6\u95F4", keywords: ["\u5DE5\u4F5C\u5F00\u59CB\u65F6\u95F4", "\u5165\u804C\u65F6\u95F4", "\u5B9E\u4E60\u5F00\u59CB\u65F6\u95F4", "employment start date"] },
    { path: "experience.endDate", label: "\u5DE5\u4F5C\u7ED3\u675F\u65F6\u95F4", keywords: ["\u5DE5\u4F5C\u7ED3\u675F\u65F6\u95F4", "\u79BB\u804C\u65F6\u95F4", "\u5B9E\u4E60\u7ED3\u675F\u65F6\u95F4", "employment end date"] },
    { path: "experience.description", label: "\u5DE5\u4F5C\u63CF\u8FF0", keywords: ["\u5DE5\u4F5C\u63CF\u8FF0", "\u5B9E\u4E60\u63CF\u8FF0", "\u5DE5\u4F5C\u5185\u5BB9", "\u7ECF\u5386\u63CF\u8FF0", "work description", "job description"] },
    { path: "skills.programming", label: "\u7F16\u7A0B\u8BED\u8A00", keywords: ["\u7F16\u7A0B\u8BED\u8A00", "\u7A0B\u5E8F\u8BED\u8A00", "programming language", "coding skills"] },
    { path: "skills.tools", label: "\u8F6F\u4EF6\u5DE5\u5177", keywords: ["\u8F6F\u4EF6\u5DE5\u5177", "\u5F00\u53D1\u5DE5\u5177", "\u5DE5\u5177\u8F6F\u4EF6", "software tools", "tools"] },
    { path: "skills.embedded", label: "\u5D4C\u5165\u5F0F\u6280\u80FD", keywords: ["\u5D4C\u5165\u5F0F", "\u5355\u7247\u673A", "embedded", "mcu"] },
    { path: "skills.robotics", label: "\u673A\u5668\u4EBA\u6280\u80FD", keywords: ["\u673A\u5668\u4EBA\u6280\u80FD", "\u673A\u5668\u4EBA", "robotics", "ros"] },
    { path: "skills.mechanical", label: "\u673A\u68B0\u8BBE\u8BA1", keywords: ["\u673A\u68B0\u8BBE\u8BA1", "\u7ED3\u6784\u8BBE\u8BA1", "mechanical design", "cad"] },
    { path: "skills.english", label: "\u82F1\u8BED\u80FD\u529B", keywords: ["\u82F1\u8BED\u80FD\u529B", "\u82F1\u8BED\u6C34\u5E73", "\u5916\u8BED\u6C34\u5E73", "english proficiency", "english level"] },
    { path: "skills.other", label: "\u5176\u4ED6\u6280\u80FD", keywords: ["\u5176\u4ED6\u6280\u80FD", "\u6280\u80FD\u7279\u957F", "\u4E13\u4E1A\u6280\u80FD", "other skills", "skills"] },
    { path: "snippets.selfEvaluation", label: "\u81EA\u6211\u8BC4\u4EF7", keywords: ["\u81EA\u6211\u8BC4\u4EF7", "\u81EA\u6211\u4ECB\u7ECD", "\u4E2A\u4EBA\u8BC4\u4EF7", "\u4E2A\u4EBA\u603B\u7ED3", "self evaluation", "about yourself", "summary"] },
    { path: "snippets.personalStrengths", label: "\u4E2A\u4EBA\u4F18\u52BF", keywords: ["\u4E2A\u4EBA\u4F18\u52BF", "\u6838\u5FC3\u4F18\u52BF", "\u7ADE\u4E89\u529B", "strengths", "advantages"] },
    { path: "snippets.careerPlan", label: "\u804C\u4E1A\u89C4\u5212", keywords: ["\u804C\u4E1A\u89C4\u5212", "\u672A\u6765\u89C4\u5212", "\u804C\u4E1A\u76EE\u6807", "career plan", "career goals"] },
    { path: "snippets.projectIntro", label: "\u9879\u76EE\u4ECB\u7ECD", keywords: ["\u9879\u76EE\u4ECB\u7ECD", "\u9879\u76EE\u6982\u8FF0", "project overview"], conflicts: ["\u540D\u79F0"] }
  ];

  // src/matcher/matcher.ts
  var normalize = (text) => (text ?? "").toLocaleLowerCase().replace(/[\s_\-:：；;，,。()[\]【】「」"'\\.]+/g, " ").trim();
  var compact = (text) => text.replace(/\s/g, "");
  var sourceWeight = {
    label: 50,
    labelText: 50,
    placeholder: 40,
    name: 30,
    id: 30,
    ariaLabel: 35,
    autocomplete: 35,
    nearbyText: 20,
    parentText: 15,
    sectionText: 12
  };
  function textMatchStrength(source, keyword) {
    const text = normalize(source);
    const target = normalize(keyword);
    if (!text || !target) return { score: 0, kind: "" };
    if (text === target) return { score: 100, kind: "\u5B8C\u5168\u5339\u914D" };
    const sourceTokens = new Set(text.split(" "));
    const targetTokens = target.split(" ");
    if (targetTokens.length > 1 && targetTokens.every((token) => sourceTokens.has(token))) {
      return { score: 32, kind: "\u8BCD\u7EC4\u5339\u914D" };
    }
    const compactText = compact(text);
    const compactTarget = compact(target);
    if (compactTarget.length >= 2 && compactText.includes(compactTarget)) {
      const coverage = compactTarget.length / Math.max(compactText.length, compactTarget.length);
      return { score: 10 + Math.round(20 * coverage), kind: "\u5173\u952E\u8BCD\u5339\u914D" };
    }
    return { score: 0, kind: "" };
  }
  function scoreRule(field, rule) {
    let score = 0;
    const reasons = [];
    const sources = [
      ["labelText", field.labelText],
      ["label", field.label],
      ["placeholder", field.placeholder],
      ["ariaLabel", field.ariaLabel],
      ["name", field.name],
      ["id", field.id],
      ["autocomplete", field.autocomplete],
      ["nearbyText", field.nearbyText],
      ["parentText", field.parentText],
      ["sectionText", field.sectionText]
    ];
    for (const [sourceName, source] of sources) {
      let best = { score: 0, kind: "" };
      for (const keyword of rule.keywords) {
        const match = textMatchStrength(source ?? "", keyword);
        if (match.score > best.score) best = match;
      }
      if (best.score > 0) {
        const weighted = best.score === 100 ? 100 + (sourceWeight[String(sourceName)] ?? 10) : Math.min(sourceWeight[String(sourceName)] ?? 10, best.score);
        score += weighted;
        reasons.push(`${String(sourceName)} ${best.kind} +${weighted}`);
      }
    }
    const allText = sources.map(([, value]) => normalize(value)).join(" ");
    for (const conflict of rule.conflicts ?? []) {
      if (textMatchStrength(allText, conflict).score > 0) {
        score -= 30;
        reasons.push(`\u51B2\u7A81\u5173\u952E\u8BCD\u300C${conflict}\u300D -30`);
      }
    }
    if (field.type && rule.inputTypes?.includes(field.type)) {
      score += 28;
      reasons.push(`\u8F93\u5165\u7C7B\u578B ${field.type} +28`);
    }
    if (field.autocomplete && rule.autocomplete?.some((item) => field.autocomplete?.includes(item))) {
      score += 35;
      reasons.push("autocomplete \u5339\u914D +35");
    }
    return { targetField: rule.path, confidence: Math.max(0, Math.min(0.99, score / 150)), reasons, source: "rule" };
  }
  function matchField(field) {
    const results = MATCH_RULES.map((rule) => scoreRule(field, rule)).sort((a, b) => b.confidence - a.confidence);
    const best = results[0];
    const runnerUp = results[1];
    if (!best || best.confidence < 0.25) return { targetField: "", confidence: best?.confidence ?? 0, reasons: ["\u6CA1\u6709\u8DB3\u591F\u660E\u786E\u7684\u5173\u952E\u8BCD"], source: "rule" };
    if (runnerUp && best.confidence - runnerUp.confidence < 0.08 && best.confidence < 0.85) {
      return { ...best, confidence: Math.max(0, best.confidence - 0.12), reasons: [...best.reasons, "\u5B58\u5728\u76F8\u8FD1\u5019\u9009 -12%"] };
    }
    return best;
  }
  var matchFields = (fields) => fields.map(matchField);

  // src/content/index.ts
  var activeElement = null;
  var activeField = null;
  var pickerEnabled = false;
  var hoveredPickerElement = null;
  var PICKER_CLASS = "resumeflow-field-picker-hover";
  var STYLE_ID = "resumeflow-field-picker-style";
  function toActiveField(element) {
    const descriptor = describeField(element);
    return {
      elementId: descriptor.elementId,
      hostname: location.hostname || "local",
      url: location.href,
      tagName: descriptor.tagName,
      type: descriptor.type,
      id: descriptor.id,
      name: descriptor.name,
      placeholder: descriptor.placeholder,
      ariaLabel: descriptor.ariaLabel,
      labelText: descriptor.labelText ?? descriptor.label,
      nearbyText: descriptor.nearbyText,
      sectionText: descriptor.sectionText,
      editableType: descriptor.editableType,
      selectorCandidates: descriptor.selectorCandidates,
      pickedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  function postToSidePanel(message) {
    try {
      void chrome.runtime.sendMessage(message);
    } catch {
    }
  }
  function setActiveElement(element) {
    activeElement = element;
    activeField = toActiveField(element);
    postToSidePanel({ type: "ACTIVE_FIELD_CHANGED", field: activeField });
    return activeField;
  }
  function ensurePickerStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `.${PICKER_CLASS}{outline:2px solid #446b8f!important;outline-offset:2px!important;box-shadow:0 0 0 3px rgba(68,107,143,.16)!important;}`;
    document.documentElement.append(style);
  }
  function clearPickerHover() {
    hoveredPickerElement?.classList.remove(PICKER_CLASS);
    hoveredPickerElement = null;
  }
  function startPicker() {
    pickerEnabled = true;
    ensurePickerStyle();
  }
  function stopPicker() {
    pickerEnabled = false;
    clearPickerHover();
  }
  document.addEventListener("focusin", (event) => {
    if (isEditableField(event.target)) setActiveElement(event.target);
  }, true);
  document.addEventListener("focusout", (event) => {
    if (isEditableField(event.target) && activeElement === event.target) {
      activeField = toActiveField(event.target);
    }
  }, true);
  document.addEventListener("mouseover", (event) => {
    if (!pickerEnabled) return;
    const target = event.target instanceof Element ? event.target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="combobox"]') : null;
    if (!target || !isEditableField(target)) return;
    clearPickerHover();
    hoveredPickerElement = target;
    target.classList.add(PICKER_CLASS);
  }, true);
  document.addEventListener("mouseout", () => {
    if (pickerEnabled) clearPickerHover();
  }, true);
  document.addEventListener("click", (event) => {
    if (!pickerEnabled) return;
    const target = event.target instanceof Element ? event.target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="combobox"]') : null;
    if (!target || !isEditableField(target)) return;
    event.preventDefault();
    event.stopPropagation();
    const picked = setActiveElement(target);
    stopPicker();
    postToSidePanel({ type: "FIELD_PICKED", field: picked });
  }, true);
  function scan() {
    const descriptors = scanPage();
    const matches = matchFields(descriptors);
    return {
      ok: true,
      url: location.href,
      hostname: location.hostname || "local",
      fields: descriptors.map((field, index) => ({
        ...field,
        match: matches[index],
        selected: matches[index].confidence >= 0.9,
        value: ""
      })),
      repeatGroups: detectRepeatGroups(descriptors)
    };
  }
  function insertContent(value, mode = "replace") {
    if (!activeElement || !document.documentElement.contains(activeElement)) {
      return { ok: false, message: "\u8BF7\u5148\u70B9\u51FB\u7F51\u9875\u4E2D\u7684\u8F93\u5165\u6846" };
    }
    try {
      const ok = fillElement(activeElement, value, mode);
      if (!ok) return { ok: false, message: "\u8BE5\u7F51\u9875\u7EC4\u4EF6\u6682\u4E0D\u652F\u6301\u76F4\u63A5\u586B\u5199", activeField: activeField ?? void 0 };
      activeField = toActiveField(activeElement);
      return { ok: true, message: "\u5DF2\u63D2\u5165", activeField };
    } catch {
      return { ok: false, message: "\u8BE5\u7F51\u9875\u7EC4\u4EF6\u6682\u4E0D\u652F\u6301\u76F4\u63A5\u586B\u5199", activeField: activeField ?? void 0 };
    }
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "SCAN_PAGE") {
      try {
        const result = scan();
        sendResponse(result);
        postToSidePanel({ type: "SCAN_RESULT", result });
      } catch (error) {
        sendResponse({ ok: false, url: location.href, hostname: location.hostname, fields: [], repeatGroups: [], error: error instanceof Error ? error.message : "\u626B\u63CF\u5931\u8D25" });
      }
      return true;
    }
    if (message.type === "FILL_FIELDS") {
      sendResponse(fillFields(message.items));
      return true;
    }
    if (message.type === "INSERT_CONTENT") {
      const result = insertContent(message.value, message.mode);
      sendResponse(result);
      postToSidePanel({ type: "INSERT_RESULT", result });
      return true;
    }
    if (message.type === "GET_ACTIVE_FIELD") {
      sendResponse(activeField);
      return true;
    }
    if (message.type === "START_FIELD_PICKER") {
      startPicker();
      sendResponse({ ok: true });
      return true;
    }
    if (message.type === "STOP_FIELD_PICKER") {
      stopPicker();
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });
})();
