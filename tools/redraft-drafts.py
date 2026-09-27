#!/usr/bin/env python3
"""TRUE 82: build redraft-drafts.json, THE REDRAFTED's real drafts (PRO boards, v58).

The owner's brief: "PRO board: the full real first round in real draft order, plus productive
second-rounders and undrafted players chosen by AI judgment. Show real pick numbers. Take draft
order from a public draft-history dataset, not from recall. First-rounders with no eligible season
can sit greyed out in their slot so the order reads true. PICKUP unchanged."

Source: Basketball-Reference's NBA draft history, from the same public dataset the player data
comes from (sumitrodatta/bball-reference-datasets, CC BY-SA):
  curl -o /tmp/draft.csv "https://raw.githubusercontent.com/sumitrodatta/bball-reference-datasets/master/Data/Draft%20Pick%20History.csv"
  python3 tools/redraft-drafts.py /tmp/draft.csv
then bump REDRAFT_DATA_V in app.js and run node test.js.

How it decides:
- Names match site_data.json by Basketball-Reference id (bbref-map.json), so a draftee who shares a
  name with a different player never borrows his seasons. The 21 names two players share (the
  bbref-map "a" list) are split by listed height; the output carries that height.
- A player drafted twice counts in the draft that stuck (the last one before his debut).
- r1: every first-round pick in order. A pick with no season of 785+ minutes after his draft
  (the bar every mode uses) is written with -1: the client greys his slot.
- x (the productive rest): later picks and undrafted players whose best qualifying season is at
  least the class's median first-rounder's (and never under V 1.5), or a long career (8+
  qualifying seasons, V 1.0+). At most 15, by value. Undrafted players land in the draft they went
  undrafted in: their debut year by default, and the UND table below where the debut misleads
  (G League or overseas first: judgment calls, easy to edit).
- Every board must field three legal teams (6 G, 6 F, 3 C): a short board grows with the class's
  best remaining players at the short position.
"""
import json, csv, unicodedata, statistics
from collections import defaultdict
import os, sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) < 2:
    sys.exit("usage: python3 tools/redraft-drafts.py <path to Draft Pick History.csv>")
CSV=sys.argv[1]
d=json.load(open(ROOT+'/site_data.json')); cols=d['meta']['cols']; I={c:i for i,c in enumerate(cols)}
REPL=d['meta']['scoring']['REPLACEMENT']
by=defaultdict(list)
for r in d['players']: by[r[I['name']]].append(r)
bm=json.load(open(ROOT+'/bbref-map.json')); p=bm['p']; amb=set(bm['a'])
id2name=defaultdict(list)
for n,i in p.items(): id2name[i].append(n)
def fold(s): return ''.join(c for c in unicodedata.normalize('NFD',s) if unicodedata.category(c)!='Mn').lower().replace('.','').replace("'",'').replace('-',' ').strip()
foldmap=defaultdict(set)
for n in by: foldmap[fold(n)].add(n)
def V(r): return r[I['bpm_star']]-REPL
FLOOR=min(r[I['season']] for r in d['players'])
# persons: (name, ht|None) -> rows
def person_key(name,row): return (name, row[I['ht']] if name in amb else None)
persons=defaultdict(list)
for n,rows in by.items():
    for r in rows: persons[person_key(n,r)].append(r)
debut={k:min(x[I['season']] for x in v) for k,v in persons.items()}
allr=[r for r in csv.DictReader(open(CSV)) if r['lg']=='NBA']
def resolve(r):
    pid=r['player_id']; nm=r['player']; Y=int(r['season'])
    for c in id2name.get(pid,[]):
        if c in by: return (c,None) if debut[(c,None)]>=Y+1 else None
    cands=[nm] if nm in by else sorted(foldmap.get(fold(nm),[]))
    for c in cands:
        if c in amb:
            opts=[(debut[k],k) for k in persons if k[0]==c and debut[k]>=Y+1]
            if not opts: return None
            opts.sort()
            if len(opts)>1 and opts[0][0]==opts[1][0]: return None     # two same-name players debut together: unknowable, skip
            return opts[0][1]
        if c not in p:                          # no id on file for this name: accept the name match
            return (c,None) if debut[(c,None)]>=Y+1 else None
    return None                                  # the name belongs to a different player (other id), or nobody
res={}; drafts=defaultdict(list)
for r in allr:
    k=resolve(r); res[id(r)]=k
    if k: drafts[k].append((int(r['season']),int(r['round']),int(r['overall_pick'])))
def stuck(k):   # the draft that stuck: the latest one before his debut
    ds=[x for x in drafts.get(k,[]) if x[0]<debut[k]]
    return max(ds) if ds else None
# undrafted classes (the draft he went undrafted in), by judgment where the first season misleads
UND={"Scott Brooks":1987,"Tim Legler":1988,"David Benoit":1990,"Matt Bullard":1990,"David Wesley":1992,"Chris Childs":1989,
"Darrick Martin":1992,"Aaron Williams":1993,"Darrell Armstrong":1991,"Matt Maloney":1995,"Bruce Bowen":1993,"Damon Jones":1997,
"Troy Hudson":1997,"Adrian Griffin":1996,"Anthony Carter":1998,"Chucky Atkins":1996,"Mike James":1998,"Raja Bell":1999,
"Devin Brown":2002,"Udonis Haslem":2002,"Andrés Nocioni":2001,"Matt Carroll":2003,"Maurice Evans":2001,"Charlie Bell":2001,
"Ime Udoka":2000,"José Calderón":2003,"Šarūnas Jasikevičius":1998,"Kelenna Azubuike":2005,"C.J. Watson":2006,"Jamario Moon":2001,
"Anthony Tolliver":2007,"Gary Neal":2007,"Timofey Mozgov":2008,"Justin Holiday":2011,"Joe Ingles":2009,"Robert Covington":2013,
"Seth Curry":2013,"Alex Caruso":2016,"Damion Lee":2016,"Daniel Theis":2014,"Gary Payton II":2016,"Maxi Kleber":2014,
"Royce O'Neale":2015,"Chris Boucher":2017,"Javonte Green":2015,"Juan Toscano-Anderson":2015,"Dean Wade":2019,"Max Strus":2019,
"Jordan Goodwin":2021,"Collin Gillespie":2022,"Dru Smith":2022,"Keon Ellis":2022,"Micah Potter":2021,"Scotty Pippen Jr.":2022,"Jay Huff":2021}
UND_AMB={("Reggie Williams",78):2008}
classes={Y:{'r1':[], 'x':[]} for Y in range(1974,2026)}
def elig(k,Y): return [x for x in persons.get(k,[]) if x[I['mp']]>=785 and x[I['season']]>=Y+1]
for r in allr:
    Y=int(r['season'])
    if Y<1974 or Y>2025: continue
    k=res[id(r)]; e=elig(k,Y) if k else []
    ent={'pick':int(r['overall_pick']),'dname':r['player'],'k':k,'n':len(e),'best':max((V(x) for x in e),default=None),
         'peak':max((x[I['mp']] for x in e),default=0)}
    if r['round']=='1': classes[Y]['r1'].append(ent)
    elif k and e and stuck(k)==(Y,int(r['round']),int(r['overall_pick'])): classes[Y]['x'].append(ent)
for k,rows in persons.items():
    if k in drafts: continue
    if k[0] in amb and k not in UND_AMB: continue    # a shared name whose draft could not be told apart: never call him undrafted
    Y=UND_AMB.get(k) or UND.get(k[0]) or debut[k]-1
    if Y<1974 or Y>2025 or debut[k]<=FLOOR: continue
    e=elig(k,Y)
    if not e: continue
    classes[Y]['x'].append({'pick':0,'dname':k[0],'k':k,'n':len(e),'best':max(V(x) for x in e),'peak':max(x[I['mp']] for x in e)})
out={}; rep=[]
for Y in range(1974,2026):
    c=classes[Y]; r1=sorted(c['r1'],key=lambda e:e['pick'])
    meds=[e['best'] for e in r1 if e['n']]
    bar=max(1.5, statistics.median(meds) if meds else 0)
    keep=[e for e in c['x'] if e['best']>=bar or (e['n']>=8 and e['best']>=1.0)]
    keep=sorted(keep,key=lambda e:-e['best'])[:15]
    # the board must field three legal teams (6 G, 6 F, 3 C, by each season's primary position, as the client reads
    # it): if it cannot, grow it with the class's best remaining players who fill the short spot (sdCohortPick's rule)
    def bks(e, Y=Y):
        out=set()
        for x in persons[e['k']]:
            if x[I['mp']]<785 or x[I['season']]<Y+1: continue
            t=str(x[I['pos']]).split('-')[0].strip().upper()
            if t in ('PG','SG') or t[:1]=='G': out.add('G')
            elif t in ('SF','PF') or t[:1]=='F': out.add('F')
            elif t[:1]=='C': out.add('C')
            else:
                if x[I['g_pct']]>=20: out.add('G')
                if x[I['f_pct']]>=20: out.add('F')
                if x[I['c_pct']]>=20: out.add('C')
        return out
    def hall(ents):
        need={'G':6,'F':6,'C':3}; sup=[bks(e) for e in ents]
        for S in (('G',),('F',),('C',),('G','F'),('G','C'),('F','C'),('G','F','C')):
            if sum(need[b] for b in S) > sum(1 for bs in sup if bs & set(S)): return set(S)
        return None
    base=[e for e in r1 if e['n']]
    rest=sorted([e for e in c['x'] if e not in keep], key=lambda e:-e['best'])
    grown=[]
    for _ in range(8):
        short=hall(base+keep)
        if not short: break
        add=next((e for e in rest if e not in keep and bks(e) & short), None)
        if not add: print('UNFIELDABLE', Y, short); break
        keep.append(add); grown.append(add['k'][0])
    if grown: print('grew', Y, 'to field three teams:', grown)
    keep.sort(key=lambda e:(e['pick']==0, e['pick'], -e['peak']))
    def ent(e):
        k=e['k']
        if not k or not e['n']: return [e['pick'], k[0] if k else e['dname'], -1]
        a=[e['pick'], k[0]]
        if k[1] is not None: a.append(k[1])
        return a
    R1=[ent(e) for e in r1]; X=[ent(e) for e in keep]
    out[str(Y)]={'r1':R1,'x':X}
    rep.append((Y,len(R1),sum(1 for a in R1 if len(a)>2 and a[2]==-1),len(X),[a[1]+('' if a[0] else '*') for a in X]))
doc={'v':1,
 'src':'NBA draft history from Basketball-Reference via sumitrodatta/bball-reference-datasets (Draft Pick History.csv, CC BY-SA, fetched 2026-09-26), matched to site_data.json by Basketball-Reference id (bbref-map.json)',
 'note':'Per class: r1 = the real first round in pick order; x = productive later picks and undrafted players (pick 0), chosen by best qualifying season. A third number is a height in inches that picks one of two players sharing a name, or -1 for a pick with no playable season in the data.',
 'c':out}
s=json.dumps(doc, ensure_ascii=False, separators=(',',':'))
open(ROOT+'/redraft-drafts.json','w').write(s)
print('wrote redraft-drafts.json,', len(s.encode()), 'bytes')
for r in rep: print(r[0], 'first round', r[1], '(greyed', str(r[2]) + ')', 'extras', r[3])
