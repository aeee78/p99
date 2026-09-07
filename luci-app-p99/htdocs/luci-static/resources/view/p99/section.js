"use strict";
"require baseclass";
"require view.p99.main as main";

function isSingBoxDuration(value) {
  return typeof main !== "undefined" && main.isSingBoxDuration
    ? main.isSingBoxDuration(value)
    : /^(?=.*[1-9])([0-9]+(?:\.[0-9]+)?(?:ns|us|ms|s|m|h|d))+$/.test(value);
}

function configureSectionSection(sectionRef, options) {
  return main.configureSectionSection(sectionRef, options);
}

function createSectionContent(section) {
  return main.createSectionContent(section);
}

function setActionProvidersAvailabilityLoader(loader) {
  return main.setActionProvidersAvailabilityLoader(loader);
}

const EntryPoint = {
  configureSectionSection,
  createSectionContent,
  setActionProvidersAvailabilityLoader,
};

return baseclass.extend(EntryPoint);
