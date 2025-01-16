import Text "mo:base/Text";

module {
    public func normalizeUrl(url: Text) : Text {
        switch (Text.endsWith(url, #text "/")) {
            case true {
                let trimmedSlash = Text.trimEnd(url, #text "/");
                let trimmedDot = Text.trimEnd(trimmedSlash, #text ".");
                if (Text.contains(trimmedDot, #text ".")) {
                    trimmedDot
                } else {
                    trimmedDot # ".html"
                };
            };
            case false {
                if (Text.contains(url, #text ".")) {
                    url
                } else {
                    url # ".html"
                };
            };
        };
    };
};