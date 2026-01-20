export default (new class I18N {
    constructor() {
        // Loading Language
    }

    __(string) {
        // @ToDo translate
        return string;
    }

    // Singular / Plural detecion
    __sp(singular, plural, count) {
        if(count === 1) {
            return singular;
        }

        return plural;
    }
}());