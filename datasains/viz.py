"""
viz.py — grafik & komponen dashboard dstools (Altair + Streamlit).

Aturan desain yang dipakai di semua grafik:
- bentuk dipilih dulu (angka tunggal = hero figure, bukan grafik satu batang),
- satu seri = satu warna (biru); sorotan = biru + abu-abu; arah +/- = biru <-> merah,
- batang tipis (maks. 24px), ujung data membulat 4px, celah 2px antar batang,
- garis 2px, titik >= 8px dengan cincin 2px warna latar,
- grid & sumbu garis rambut solid yang samar; teks pakai warna tinta, bukan warna seri,
- label langsung secukupnya (ujung batang), tooltip saat hover, dan selalu ada tampilan tabel,
- mode gelap punya warnanya sendiri (bukan dibalik otomatis).
"""
from __future__ import annotations

import html

import altair as alt
import numpy as np
import pandas as pd
import streamlit as st

FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif'

TOKENS = {
    "light": {
        "surface": "#fcfcfb", "page": "#f9f9f7", "ink": "#0b0b0b", "ink2": "#52514e", "muted": "#898781",
        "grid": "#e1e0d9", "axis": "#c3c2b7", "border": "rgba(11,11,11,0.10)",
        "series": ["#2a78d6", "#eb6834", "#1baf7a"], "deemph": "#c3c2b7",
        "pos": "#2a78d6", "neg": "#e34948", "good": "#006300",
    },
    "dark": {
        "surface": "#1a1a19", "page": "#0d0d0d", "ink": "#f0efec", "ink2": "#c3c2b7", "muted": "#898781",
        "grid": "#2c2c2a", "axis": "#383835", "border": "rgba(255,255,255,0.10)",
        "series": ["#3987e5", "#d95926", "#199e70"], "deemph": "#52514e",
        "pos": "#3987e5", "neg": "#e66767", "good": "#0ca30c",
    },
}

BAR = 16          # tebal batang (px), di bawah batas 24px
ROW = 28
ID_THOUSANDS = "replace(datum.label, ',', '.')"   # 1,500 -> 1.500 (gaya Indonesia) untuk sumbu bilangan bulat          # tinggi satu baris pada grafik batang horizontal
AXIS_BAND = 40    # ruang label sumbu x, ikut dihitung dalam tinggi grafik


def mode() -> str:
    try:
        t = st.context.theme.type
    except Exception:  # di luar sesi Streamlit
        t = None
    return "dark" if t == "dark" else "light"


def tok() -> dict:
    return TOKENS[mode()]


def _config(chart: alt.Chart) -> alt.Chart:
    t = tok()
    return (chart.configure(background=t["surface"], font=FONT, padding={"left": 4, "right": 12, "top": 8, "bottom": 4})
            .configure_view(stroke=None)
            .configure_axis(domainColor=t["axis"], gridColor=t["grid"], gridWidth=1, gridDash=[], tickColor=t["axis"],
                            labelColor=t["muted"], titleColor=t["ink2"], labelFontSize=12, titleFontSize=12,
                            titleFontWeight="normal", labelPadding=6, tickSize=0)
            .configure_legend(labelColor=t["ink2"], titleColor=t["ink2"], labelFontSize=12, titleFontSize=12,
                              titleFontWeight="normal", orient="top", symbolType="circle", symbolSize=80)
            .configure_title(color=t["ink"], font=FONT, fontSize=14, fontWeight=600, anchor="start"))


def show(chart: alt.Chart, table: pd.DataFrame | None = None, table_label: str = "Lihat sebagai tabel"):
    """Tampilkan grafik + tabel kembarannya (nilai selalu bisa dibaca tanpa hover)."""
    st.altair_chart(_config(chart), theme=None, width="stretch")
    if table is not None:
        with st.expander(table_label):
            st.dataframe(table, width="stretch", hide_index=True)


def _fmt(v: float) -> str:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return "–"
    a = abs(v)
    if a >= 1e6:
        return f"{v / 1e6:.1f} jt"
    if a >= 1e4:
        return f"{v / 1e3:.1f} rb"
    if a >= 100:
        return f"{v:,.0f}".replace(",", ".")
    return f"{v:.3g}"


# --------------------------------------------------------------------------- figur

def css():
    """CSS kecil untuk hero figure & stat tile (warna mengikuti mode terang/gelap)."""
    t = tok()
    st.markdown(f"""<style>
.ds-hero {{ font-family:{FONT}; padding:4px 0 8px; }}
.ds-hero .lbl {{ color:{t['ink2']}; font-size:14px; }}
.ds-hero .val {{ color:{t['ink']}; font-size:56px; font-weight:600; line-height:1.1; letter-spacing:-0.01em; }}
.ds-hero .ctx {{ color:{t['muted']}; font-size:13px; }}
.ds-note {{ color:{t['ink2']}; font-size:13px; font-family:{FONT}; margin:-4px 0 12px; }}
h1, h2, h3 {{ letter-spacing:-0.01em; }}
.block-container {{ padding-top:2.5rem; }}
[data-testid="stMainBlockContainer"] h2 {{ margin-top:0.75rem; }}
/* pilihan multiselect: chip tenang (bukan blok biru jenuh) */
[data-testid="stMultiSelectTagsContainer"] > span > span {{ background:{t['grid']} !important; color:{t['ink']} !important; }}
[data-testid="stMultiSelectTagsContainer"] > span > span * {{ color:{t['ink']} !important; }}
[data-testid="stMultiSelectTagsContainer"] > span > span svg {{ fill:{t['ink2']} !important; }}
</style>""", unsafe_allow_html=True)


def hero(label: str, value: str, context: str = ""):
    """Satu angka utama per tampilan (>= 48px, sans yang sama)."""
    st.markdown(f"<div class='ds-hero'><div class='lbl'>{html.escape(label)}</div>"
                f"<div class='val'>{html.escape(value)}</div>"
                f"<div class='ctx'>{html.escape(context)}</div></div>", unsafe_allow_html=True)


def note(text: str):
    st.markdown(f"<div class='ds-note'>{html.escape(text)}</div>", unsafe_allow_html=True)


# --------------------------------------------------------------------------- grafik

def hbar(s: pd.Series, value_title: str, label_fmt=None, highlight: str | None = None,
         max_rows: int = 20, counts: bool = False, percent: bool = False) -> tuple[alt.Chart, pd.DataFrame]:
    """Batang horizontal berperingkat (terbesar di atas). Satu warna; `highlight` = sorotan satu batang."""
    t = tok()
    s = s.dropna().sort_values(ascending=False).head(max_rows)
    label_fmt = label_fmt or _fmt
    df = pd.DataFrame({"nama": s.index.astype(str), "nilai": s.values.astype(float)})
    df["label"] = [label_fmt(v) for v in df["nilai"]]
    color = (alt.condition(alt.datum.nama == str(highlight), alt.value(t["series"][0]), alt.value(t["deemph"]))
             if highlight is not None else alt.value(t["series"][0]))
    y = alt.Y("nama:N", sort=None, title=None, axis=alt.Axis(grid=False, domain=False, labelLimit=180,
                                                            labelColor=t["ink2"]))
    axis = alt.Axis(grid=True, tickCount=4, domain=False, format=",d", labelExpr=ID_THOUSANDS) if counts \
        else alt.Axis(grid=True, tickCount=4, domain=False, format=".0%" if percent else alt.Undefined)
    x = alt.X("nilai:Q", title=value_title, axis=axis)
    base = alt.Chart(df).encode(y=y, x=x)
    bars = base.mark_bar(size=BAR, cornerRadiusEnd=4).encode(
        color=color, tooltip=[alt.Tooltip("nama:N", title="Nama"), alt.Tooltip("label:N", title=value_title)])
    text = base.mark_text(align="left", dx=6, color=t["ink2"], fontSize=12).encode(text="label:N")
    chart = (bars + text).properties(height=len(df) * ROW + AXIS_BAND)
    return chart, df[["nama", "label"]].rename(columns={"nama": "Nama", "label": value_title})


def diverging_bar(s: pd.Series, value_title: str, max_rows: int = 15) -> tuple[alt.Chart, pd.DataFrame]:
    """Batang +/- dari garis nol: biru = positif, merah = negatif. Diurutkan menurut besarnya."""
    t = tok()
    s = s.dropna()
    s = s.reindex(s.abs().sort_values(ascending=False).index).head(max_rows)
    df = pd.DataFrame({"nama": s.index.astype(str), "nilai": s.values.astype(float)})
    df["arah"] = np.where(df["nilai"] >= 0, "positif", "negatif")
    df["label"] = [f"{v:+.2f}" for v in df["nilai"]]
    lim = max(0.1, float(df["nilai"].abs().max()) * 1.25)
    y = alt.Y("nama:N", sort=None, title=None, axis=alt.Axis(grid=False, domain=False, labelLimit=180,
                                                            labelColor=t["ink2"]))
    x = alt.X("nilai:Q", title=value_title, scale=alt.Scale(domain=[-lim, lim]),
              axis=alt.Axis(grid=True, tickCount=5, domain=False))
    base = alt.Chart(df).encode(y=y, x=x)
    bars = base.mark_bar(size=BAR, cornerRadiusEnd=4).encode(
        color=alt.Color("arah:N", scale=alt.Scale(domain=["positif", "negatif"], range=[t["pos"], t["neg"]]),
                        legend=alt.Legend(title=None)),
        tooltip=[alt.Tooltip("nama:N", title="Kolom"), alt.Tooltip("label:N", title=value_title),
                 alt.Tooltip("arah:N", title="Arah")])
    text = base.mark_text(dx=alt.ExprRef("datum.nilai >= 0 ? 6 : -6"),
                          align=alt.ExprRef("datum.nilai >= 0 ? 'left' : 'right'"),
                          color=t["ink2"], fontSize=12).encode(text="label:N")
    zero = alt.Chart(pd.DataFrame({"x": [0]})).mark_rule(color=t["axis"], strokeWidth=1).encode(x="x:Q")
    chart = (bars + text + zero).properties(height=len(df) * ROW + AXIS_BAND + 24)
    return chart, df[["nama", "label", "arah"]].rename(columns={"nama": "Kolom", "label": value_title, "arah": "Arah"})


def histogram(values: pd.Series, value_title: str, bins: int = 30) -> tuple[alt.Chart, pd.DataFrame]:
    """Histogram kolom: batang bersentuhan dipisah celah 2px, ujung atas membulat."""
    t = tok()
    v = pd.to_numeric(values, errors="coerce").dropna()
    bulat = bool(len(v)) and np.allclose(v, v.round())
    if bulat:
        # bilangan bulat (umur, jumlah): lebar kelompok bulat & rata, supaya tidak muncul pola naik-turun palsu
        step = max(1, int(np.ceil((v.max() - v.min() + 1) / bins)))
        edges = np.arange(v.min() - 0.5, v.max() + step + 0.5, step)
        counts, edges = np.histogram(v, bins=edges)
    else:
        counts, edges = np.histogram(v, bins=min(bins, max(5, v.nunique())))
    # y2 = 0 ditulis eksplisit: tanpa itu Vega-Lite tidak menggambar batang 'binned' yang ujungnya dibulatkan
    df = pd.DataFrame({"dari": edges[:-1], "sampai": edges[1:], "jumlah": counts, "nol": 0})
    if bulat:
        df["rentang"] = [f"{int(a + 0.5)}" if b - a <= 1 else f"{int(a + 0.5)}–{int(b - 0.5)}"
                         for a, b in zip(df["dari"], df["sampai"])]
    else:
        df["rentang"] = [f"{_fmt(a)} – {_fmt(b)}" for a, b in zip(df["dari"], df["sampai"])]
    chart = alt.Chart(df).mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4, color=t["series"][0],
                                   stroke=t["surface"], strokeWidth=2).encode(
        x=alt.X("dari:Q", bin="binned", title=value_title,
                axis=alt.Axis(grid=False, tickCount=6, format="~s" if v.abs().max() >= 1e4 else alt.Undefined)),
        x2="sampai:Q", y2="nol:Q",
        y=alt.Y("jumlah:Q", title="Jumlah baris",
                axis=alt.Axis(grid=True, tickCount=4, domain=False, format=",d", labelExpr=ID_THOUSANDS)),
        tooltip=[alt.Tooltip("rentang:N", title="Rentang"), alt.Tooltip("jumlah:Q", title="Jumlah", format=",")],
    ).properties(height=240)
    return chart, df[["rentang", "jumlah"]].rename(columns={"rentang": "Rentang", "jumlah": "Jumlah"})


def model_scores(lb: pd.DataFrame, metric: str, greater: bool) -> tuple[alt.Chart, pd.DataFrame]:
    """Skor CV per model: titik + rentang ±1 std antar fold. Model terbaik disorot, lainnya abu-abu.

    Titik (bukan batang) karena skor berdekatan (0,80 vs 0,82): batang dari nol membuat semuanya
    tampak sama; titik membiarkan sumbu fokus pada rentang yang penting.
    """
    t = tok()
    df = lb[["model", metric, "std_fold"]].copy()
    df["std_fold"] = df["std_fold"].fillna(0)
    df["lo"], df["hi"] = df[metric] - df["std_fold"], df[metric] + df["std_fold"]
    best = df.iloc[0]["model"]
    df["peran"] = np.where(df["model"] == best, "terbaik", "lainnya")
    df["label"] = [f"{v:.4f}" for v in df[metric]]
    df["std_label"] = [f"± {v:.4f}" if v else "–" for v in df["std_fold"]]
    lo, hi = df["lo"].min(), df["hi"].max()
    pad = (hi - lo) * 0.15 or 0.01
    color = alt.Color("peran:N", scale=alt.Scale(domain=["terbaik", "lainnya"], range=[t["series"][0], t["muted"]]),
                      legend=None)
    y = alt.Y("model:N", sort=list(df["model"]), title=None,
              axis=alt.Axis(grid=False, domain=False, labelLimit=260, labelColor=t["ink2"]))
    x_scale = alt.Scale(domain=[lo - pad, hi + pad], zero=False)
    tip = [alt.Tooltip("model:N", title="Model"), alt.Tooltip("label:N", title=metric),
           alt.Tooltip("std_label:N", title="Std antar fold")]
    base = alt.Chart(df).encode(y=y)
    rng = base.mark_rule(strokeWidth=2, strokeCap="round").encode(
        x=alt.X("lo:Q", scale=x_scale, title=f"{metric} (CV) — {'makin besar' if greater else 'makin kecil'} makin baik",
                axis=alt.Axis(grid=True, tickCount=5, domain=False)),
        x2="hi:Q", color=color, opacity=alt.value(0.45), tooltip=tip)
    dots = base.mark_point(filled=True, size=110, stroke=t["surface"], strokeWidth=2, opacity=1).encode(
        x=alt.X(f"{metric}:Q", scale=x_scale), color=color, tooltip=tip)
    text = base.transform_filter(alt.datum.peran == "terbaik").mark_text(
        dy=-12, color=t["ink2"], fontSize=12).encode(x=alt.X(f"{metric}:Q", scale=x_scale), text="label:N")
    chart = (rng + dots + text).properties(height=len(df) * ROW + AXIS_BAND + 12)
    table = df[["model", "label", "std_label"]].rename(
        columns={"model": "Model", "label": metric, "std_label": "Std antar fold"})
    return chart, table


def tuning_progress(hist: pd.DataFrame, metric: str, greater: bool,
                    model_order: list[str]) -> tuple[alt.Chart, pd.DataFrame]:
    """Skor tiap percobaan (titik samar) + skor terbaik sejauh ini (garis 2px). Hover = garis bantu + tooltip."""
    t = tok()
    rows = []
    for m, g in hist.groupby("model", sort=False):
        g = g.reset_index(drop=True)
        best = g[metric].cummax() if greater else g[metric].cummin()
        rows.append(pd.DataFrame({"model": m, "percobaan": np.arange(1, len(g) + 1),
                                  "skor": g[metric].values, "terbaik": best.values}))
    df = pd.concat(rows, ignore_index=True)
    models = [m for m in model_order if m in set(df["model"])] or list(dict.fromkeys(df["model"]))
    models = models[:3]  # maks. 3 seri berwarna; selebihnya dilipat
    df = df[df["model"].isin(models)]
    color = alt.Color("model:N", scale=alt.Scale(domain=models, range=t["series"][:len(models)]),
                      legend=alt.Legend(title=None) if len(models) > 1 else None)
    hover = alt.selection_point(fields=["percobaan"], nearest=True, on="pointerover", empty=False,
                                clear="pointerout")
    n_max = int(df["percobaan"].max())
    x_scale = alt.Scale(domain=[1, n_max + max(1.0, n_max * 0.12)], nice=False)  # ruang untuk label ujung
    base = alt.Chart(df).encode(x=alt.X("percobaan:Q", title="Percobaan ke-", scale=x_scale,
                                        axis=alt.Axis(grid=False, tickMinStep=1, format="d")))
    pts = base.mark_circle(size=40, opacity=0.35).encode(
        y=alt.Y("skor:Q", title=metric, scale=alt.Scale(zero=False), axis=alt.Axis(grid=True, tickCount=4, domain=False)),
        color=color)
    line = base.mark_line(strokeWidth=2, strokeCap="round", strokeJoin="round", interpolate="step-after").encode(
        y="terbaik:Q", color=color)
    rule = base.mark_rule(color=t["axis"], strokeWidth=1).encode(
        opacity=alt.condition(hover, alt.value(1), alt.value(0)),
        tooltip=[alt.Tooltip("model:N", title="Model"), alt.Tooltip("percobaan:Q", title="Percobaan"),
                 alt.Tooltip("skor:Q", title="Skor", format=".4f"),
                 alt.Tooltip("terbaik:Q", title="Terbaik sejauh ini", format=".4f")]).add_params(hover)
    marker = base.mark_point(filled=True, size=90, stroke=t["surface"], strokeWidth=2).encode(
        y="terbaik:Q", color=color, opacity=alt.condition(hover, alt.value(1), alt.value(0)))
    last = df.groupby("model").tail(1)
    end = alt.Chart(last).mark_text(align="left", dx=8, color=t["ink2"], fontSize=12).encode(
        x=alt.X("percobaan:Q", scale=x_scale), y="terbaik:Q", text=alt.Text("terbaik:Q", format=".4f"))
    chart = (pts + line + rule + marker + end).properties(height=260)
    table = df.rename(columns={"model": "Model", "percobaan": "Percobaan", "skor": "Skor",
                               "terbaik": "Terbaik sejauh ini"}).round(5)
    return chart, table
