import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    enablePlugin: {
        description: "Enables or Disables the plugin",
        type: OptionType.BOOLEAN,
        default: true
    },
    fileProvider: {
        description: "Select your providers between 3 different file hosting services.",
        type: OptionType.SELECT,
        options: [
            {
                "label": "BuzzHeavier",
                "value": "buzzheavier"
            },
            {
                "label": "Catbox",
                "value": "catbox",
                default: true
            },
            {
                "label": "Litterbox",
                "value": "litterbox"
            }
        ]
    },

    litterboxTimelimit: {
        description: "Sets the litterbox timelimit since litterbox isn't permanant.",
        type: OptionType.SELECT,
        options: [
            {
                "label": "1 Hour",
                "value": "1h"
            },
            {
                "label": "12 Hours",
                "value": "12h"
            },
            {
                "label": "24 Hours (1 Day)",
                "value": "24h",
                default: true
            },
            {
                "label": "72 Hours (3 Days)",
                "value": "72h"
            },
        ]
    }
})