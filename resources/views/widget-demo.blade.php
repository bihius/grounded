<!DOCTYPE html>
<html lang="pl">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Grounded - widget do osadzenia</title>
        <style>
            body { margin: 0; padding: 64px 24px; background: #f8fafc; color: #0f172a; font-family: system-ui, sans-serif; line-height: 1.6; }
            main { max-width: 640px; margin: 0 auto; }
            h1 { font-size: 28px; margin-bottom: 8px; }
            p { color: #475569; }
            pre { padding: 16px; border-radius: 12px; background: #0f172a; color: #e2e8f0; overflow-x: auto; font-size: 13px; }
        </style>
    </head>
    <body>
        <main>
            <h1>Strona, która nie jest aplikacją</h1>
            <p>
                Ta strona udaje cudzy serwis - nie ma tu Reacta ani stylów aplikacji.
                Widget w prawym dolnym rogu pochodzi w całości z jednej linijki:
            </p>
            <pre>&lt;script src="{{ url('/widget.js') }}" data-title="Zapytaj o ETF-y" defer&gt;&lt;/script&gt;</pre>
            <p>
                Atrybuty <code>data-api</code>, <code>data-title</code> i <code>data-accent</code> są opcjonalne.
            </p>
        </main>

        <script src="/widget.js" data-title="Zapytaj o ETF-y" defer></script>
    </body>
</html>
