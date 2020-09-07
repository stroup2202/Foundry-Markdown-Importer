class MarkdownParser {
    private static _instance: MarkdownParser;

    private constructor() {
    }

    public static getInstance(): MarkdownParser {
        if (!MarkdownParser._instance) MarkdownParser._instance = new MarkdownParser();
        return MarkdownParser._instance;
    }

    public parser(markdownText) {
        console.log(markdownText);
    }
}

export default MarkdownParser.getInstance();