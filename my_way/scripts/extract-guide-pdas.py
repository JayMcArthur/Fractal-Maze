import importlib.util,json,io,contextlib,pathlib
root=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('source',root/'Papers/Fractal_Maze_to_PDA/Fractal_Maze_PDA.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
actual=module.DPDA;translate=module.translate_transitions;capture={}
def trans(pairs,symbols):
 capture['pairs']=pairs
 return translate(pairs,symbols)
class Record:
 def __init__(self,**args):
  self.actual=actual(**args);capture.update(start=args['initial_state'][1:],goal=next(iter(args['final_states']))[1:],paths=sorted([s[1:] for s in args['states']],key=ord),copies=sorted(args['stack_symbols']-{''}))
 def accepts_input(self,path):capture['providedInput']=path;return self.actual.accepts_input(path)
 def read_input_stepwise(self,path):return self.actual.read_input_stepwise(path)
module.DPDA=Record;module.translate_transitions=trans
fixtures=[]
for i in range(1,6):
 capture={}
 with contextlib.redirect_stdout(io.StringIO()):module.define_maze(i)
 capture['fixture']=i;fixtures.append(capture)
# Six-copy v6 is a parameterized WIP conversion, distinct from the eight-copy source fixture.
with contextlib.redirect_stdout(io.StringIO()):v6_input=module.create_path(7)
fixtures.append({'fixture':6,'paths':[str(i)for i in range(1,8)],'copies':list('ABCDEF'),'start':'1','goal':'7','providedInput':v6_input,'pairs':[['1-1','A/']]+[[f'1-{i+2}',copy+'/']for i,copy in enumerate('ABCDEF')]+[[f'{i+1}-{i+1}',copy+'/']for i,copy in enumerate('ABCDEF')if i>0]})
(root/'my_way/src/data/mazes/path-fixtures.json').write_text(json.dumps(fixtures,indent=2))
print([(f['fixture'],len(f['providedInput']),len(f['pairs']))for f in fixtures])
