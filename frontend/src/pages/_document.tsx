import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          {/* SEO Meta Tags */}
          <meta charSet="utf-8" />
          <meta name="description" content="NoteMind – The AI-powered learning platform that transforms any topic into structured notes, adaptive quizzes, and interactive flashcards. Master any subject with intelligent learning." />
          <meta name="keywords" content="AI learning, study notes, quiz generator, flashcards, active learning, spaced repetition, NoteMind" />
          <meta name="author" content="NoteMind" />

          {/* Open Graph */}
          <meta property="og:title" content="NoteMind – From Notes to Mastery" />
          <meta property="og:description" content="AI-powered learning platform that transforms any topic into structured notes, quizzes, and flashcards." />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="NoteMind" />

          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="NoteMind – From Notes to Mastery" />
          <meta name="twitter:description" content="AI-powered learning platform. Generate notes, quizzes, and flashcards instantly." />

          {/* Theme */}
          <meta name="theme-color" content="#050505" />
          <meta name="color-scheme" content="dark" />

          {/* Favicon */}
          <link rel="icon" href="/favicon.ico" />

          {/* Preload Fonts for Performance */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
