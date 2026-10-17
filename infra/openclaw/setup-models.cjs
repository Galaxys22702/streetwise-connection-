// Shared by the build-time page patch and focused setup behavior tests.
// Model IDs and provider aliases are resolved by OpenClaw, not UI group names.
module.exports = {
  syncAuthGroups(groups) {
    this.authGroups = groups;
    if (!groups.some(group => group.value === this.selectedGroup)) {
      if (this.selectedGroup) {
        this.authSecret = "";
        this.model = "";
      }
      this.selectedGroup = groups[0]?.value || "";
    }
    this.updateAuthChoices();
  },

  updateAuthChoices() {
    const group = this.authGroups.find(item => item.value === this.selectedGroup);
    this.authChoices = group?.options || [];
    if (!this.authChoices.some(choice => choice.value === this.selectedAuth)) {
      if (this.selectedAuth) {
        this.authSecret = "";
        this.model = "";
      }
      this.selectedAuth = this.authChoices[0]?.value || "";
    }
  },

  changeAuthProvider() {
    this.authSecret = "";
    this.model = "";
    this.updateAuthChoices();
  },

  changeAuthMethod() {
    this.authSecret = "";
    this.model = "";
  }
};
