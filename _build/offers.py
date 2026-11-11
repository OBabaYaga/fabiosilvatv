# -*- coding: utf-8 -*-
# Dados das ofertas. Campos com "—" ainda não confirmados: preenche quando tiveres os valores.
# pay: btc, card, mbway, gpay, apay, bank, skrill, usdt

OFFERS = [
    dict(
        id="royalxo", logo="assets/brands/royalxo-logo.png", logo_h=52, name="Royal XO", brand_html="ROYAL XO",
        art="linear-gradient(135deg, #0a1428, #1c2f57 55%, #b8764a 100%)",
        badges=["new", "fs", "hot"], cats=["welcome", "fs", "new", "hot"],
        headline='<span class="accent">+100%</span>', tag="Até 4.000€ + 1.200 giros grátis",
        bonus="100% até 4.000€", fs="1.200", min_dep="10€", withdraw="Mín. 10€", license="Não divulgada", code="—",
        pay=["card", "bank", "btc"],
        link="https://che.fluxbrox.com/redirect.aspx?pid=198342&lpid=1845&bid=1756",
        deposits=[("1º", "100% até 1.000€ + 300 giros + bónus game", "min. 10€"), ("2º", "100% até 1.000€ + 300 giros", ""), ("3º", "100% até 1.000€ + 300 giros", ""), ("4º", "100% até 1.000€ + 300 giros", ""), ("Seg", "Recarga 100% até 100€", "semanal"), ("Qua/Sex", "Recarga 100% até 100€ + 50 giros", "semanal")],
        perks=["Bónus repartido pelos 4 primeiros depósitos", "Roda da Fortuna diária", "Torneios, missões e programa VIP", "Casino ao vivo e apostas desportivas", "Recargas semanais à segunda, quarta e sexta"],
        desc="Casino online com bónus de boas-vindas em 4 depósitos, roda da fortuna diária, torneios e casino ao vivo. Requisito de aposta: ver T&C no site da marca.",
    ),
    dict(
        id="betlabel", logo="assets/brands/betlabel.svg", name="Betlabel", brand_html="BETLABEL",
        art="linear-gradient(135deg, #0c8840, #06331a 70%, #0a0a0a)",
        badges=["hot"], cats=["welcome", "fs", "sports"],
        headline='<span class="accent">+200%</span>', tag="Bónus de boas-vindas + 150 giros",
        bonus="200% até 1.500€", fs="150", min_dep="10€", withdraw="0% comissão", license="Curaçao", code="—",
        pay=["card", "bank", "btc"],
        link="https://moy.auraodin.com/redirect.aspx?pid=150609&lpid=1119&bid=1650",
        deposits=[("1º", "100% até 300€ + 30 giros", "min. 10€"), ("2º", "50% até 350€ + 35 giros", "min. 15€"), ("3º", "25% até 400€ + 40 giros", "min. 15€"), ("4º", "25% até 450€ + 45 giros", "min. 15€"), ("Qua", "Bónus de recarga", "semanal")],
        perks=["Bónus repartido pelos 4 primeiros depósitos", "+9.000 jogos de casino e apostas desportivas", "Levantamentos rápidos sem comissões", "Bónus de recarga todas as quartas-feiras", "Suporte multilingue 24/7"],
        desc="Casino e apostas desportivas num só lugar, com mais de 9.000 jogos, 0% de comissão nos levantamentos e suporte 24/7 em português. Bónus não disponíveis para contas cripto (ver T&C).",
    ),
    dict(
        id="22bit", logo="assets/brands/22bit.svg", name="22bit", brand_html='<span style="color:#f04c4d">22</span>BIT',
        art="linear-gradient(135deg, #004147, #0a8f9b 60%, #002b30)",
        badges=["new", "crypto"], cats=["welcome", "crypto", "fs", "sports"],
        headline='<span class="accent">+200%</span>', tag="Até 17.000 USDT + giros semanais",
        bonus="200% até 17.000 USDT", fs="Domingos", min_dep="1€ (cripto)", withdraw="Instantâneo", license="Curaçao", code="—",
        pay=["btc", "usdt"],
        link="https://che.fluxbrox.com/redirect.aspx?pid=190723&lpid=1735&bid=1717",
        deposits=[("1º", "100% até 5.000 USDT", ""), ("2º", "50% até 3.500 USDT", ""), ("3º", "25% até 5.000 USDT", ""), ("4º", "25% até 3.500 USDT", ""), ("Dom", "Giros grátis", "semanal")],
        perks=["Pacote de boas-vindas em 4 depósitos", "Levantamentos cripto instantâneos e sem limite", "+9.000 jogos e apostas desportivas", "Programa VIP com até 11% de cashback", "Suporte 24/7 e pagamentos anónimos"],
        desc="Casino cripto de nova geração com mais de 9.000 jogos, levantamentos instantâneos sem limites e programa VIP com 8 níveis.",
    ),
    dict(
        id="safecasino", logo="assets/brands/safecasino-logo.png", logo_h=60, name="SafeCasino", brand_html="SAFECASINO",
        art="linear-gradient(135deg, #1f3b40, #387981 55%, #c9cf9a)",
        badges=["hot", "fs"], cats=["welcome", "fs"],
        headline='<span class="accent">+400%</span>', tag="Até 4.000€ + 1.200 giros grátis",
        bonus="400% até 4.000€", fs="1.200", min_dep="10€", withdraw="Rápido", license="Curaçao", code="—",
        pay=["card", "bank", "btc", "skrill"],
        link="https://moy.auraodin.com/redirect.aspx?pid=155521&lpid=1687&bid=1719",
        deposits=[("1º", "100% até 1.000€ + 300 giros", "min. 10€"), ("2º", "100% até 1.000€ + 300 giros", ""), ("3º", "100% até 1.000€ + 300 giros", ""), ("4º", "100% até 1.000€ + 300 giros", ""), ("3x", "Recarga 100%", "por semana")],
        perks=["Bónus repartido pelos 4 primeiros depósitos", "+7.000 jogos de mais de 120 fornecedores", "Roda da Fortuna em cada depósito", "Recarga de 100% até 3 vezes por semana", "Levantamentos rápidos"],
        desc="Um dos maiores catálogos de jogos do mercado, com mais de 120 fornecedores, roda da sorte diária e programa VIP com 50 níveis. Requisito de aposta 40x (ver T&C).",
    ),
    dict(
        id="captainsbet", logo="assets/brands/captainsbet-wordmark.png", name="CaptainsBet", brand_html="CAPTAINSBET",
        art="linear-gradient(135deg, #0b1f3a, #10305e 55%, #e8d21a)",
        badges=["fs"], cats=["welcome", "fs", "sports"],
        headline='<span class="accent">+100%</span>', tag="Até 250€ + 50 giros grátis",
        bonus="100% até 250€", fs="50", min_dep="5€", withdraw="Rápido", license="Curaçao", code="BabaYaga",
        pay=["card", "bank", "skrill"],
        link="https://captainspartners.com/processing/click?btag=22821_33956",
        deposits=[("1º", "100% até 250€ + 50 giros", "min. 5€ · 40x")],
        perks=["Bónus de boas-vindas + 50 Giros Grátis", "Casino ao vivo powered by Evolution Gaming", "Sportsbook com mais de 50 categorias", "Programa de fidelidade com 7 níveis", "Levantamentos rápidos"],
        desc="Casino ao vivo com a Evolution Gaming e sportsbook com mais de 50 categorias, incluindo futebol, basquetebol e eSports.",
    ),
]

FEATURED = ["royalxo", "safecasino", "captainsbet"]
