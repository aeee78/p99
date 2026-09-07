"use strict";
"require baseclass";
"require form";
"require uci";
"require ui";
"require view.p99.main as main";

function configureSubscriptionsSection(sectionRef) {
  return main.configureSubscriptionsSection(sectionRef);
}

function createSubscriptionsContent(section) {
  return main.createSubscriptionsContent(section);
}

const SubscriptionsModule = {
  configureSubscriptionsSection,
  createSubscriptionsContent,
};

return baseclass.extend(SubscriptionsModule);
