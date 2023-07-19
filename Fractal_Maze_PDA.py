from automata.pda.dpda import DPDA


def translate_transitions(dict_to_trans: list, s_symbols: set) -> dict:
    created_dict = {}
    for [key, item] in dict_to_trans:

        # Determine Add order
        if item[0] == '/':
            a = key.split('-')[0]
            b = key.split('-')[1]
            index = 1
        else:
            a = key.split('-')[1]
            b = key.split('-')[0]
            index = 0

        if a != b:
            # Add Transitions
            if f'q{a}' not in created_dict.keys():
                created_dict[f'q{a}'] = {}
            if f'q{b}' not in created_dict.keys():
                created_dict[f'q{b}'] = {}

            created_dict[f'q{a}'][b] = {}
            # Read: ε, Push: Symbol
            for symbol in s_symbols:
                created_dict[f'q{a}'][b][symbol] = (f'q{b}', (item[index], symbol))

            # Read: Symbol, Push: ε
            created_dict[f'q{b}'][a] = {f'{item[index]}': (f'q{a}', '')}

        else:
            # Add Transitions
            if f'q{a}' not in created_dict.keys():
                created_dict[f'q{a}'] = {}

            # Read: ε, Push: Symbol
            created_dict[f'q{a}']['('] = {}
            for symbol in s_symbols:
                created_dict[f'q{a}']['('][symbol] = (f'q{a}', (item[index], symbol))

            # Read: Symbol, Push: ε
            created_dict[f'q{a}'][')'] = {f'{item[index]}': (f'q{a}', '')}
    return created_dict


def create_path(n: int) -> str:  # JAM #1 Solver
    if n == 2:
        return '(1'
    num = [{'solve': ''}, {'solve': '(2', 'resolve': ''}]

    for index in range(2, n):
        num.append({
            'solve': f'{num[index - 1]["solve"]}(1{num[index - 2]["solve"]}){num[index - 1]["resolve"]}{index+1}',
            'resolve': f'1{num[index - 2]["solve"]}){num[index - 1]["resolve"]}'
        })
    print('Path:', num[n - 1]['solve'])
    print('Len:', len(num[n - 1]['solve']))
    return num[n-1]["solve"]


maze = 2
# Skeptic Play #1
if maze == 1:
    path = '34126(21524126(21524126(2152'
    stack_symbols = {'A', 'B', ''}
    wires = 6

    states = set()
    input_symbols = set()
    for i in range(wires):
        states.add(f'q{chr(i + 49)}')
        input_symbols.add(chr(i + 49))
    input_symbols.add('(')
    input_symbols.add(')')

    maze = DPDA(
        states=states,
        input_symbols=input_symbols,
        stack_symbols=stack_symbols,
        transitions=translate_transitions([
            ['1-2', '/A'],
            ['1-3', '/B'],
            ['1-4', 'A/'],
            ['1-5', 'B/'],
            ['2-4', 'B/'],
            ['2-5', '/A'],
            ['2-6', 'A/'],
            ['3-4', '/B'],
            ['6-6', '/B']
        ], stack_symbols),
        initial_state='q1',
        initial_stack_symbol='',
        final_states={'q2'},
        acceptance_mode='both'
    )
# Wolfram #2
elif maze == 2:
    path1 = f'3768{chr(10 + 48)}(8{chr(11 + 48)}1)4{chr(13 + 48)}{chr(10 + 48)}{chr(16 + 48)}139{chr(12 + 48)}8{chr(17 + 48)}'
    path = f'3768{chr(10 + 48)}(8{chr(11 + 48)}1){chr(15 + 48)}8{chr(10 + 48)})8{chr(17 + 48)}'
    stack_symbols = {'A', 'B', 'C', ''}
    fake_states = {}  # Need to add a fake state to fix [f'3-7', 'A/'],
    wires = 18

    states = set()
    input_symbols = set()
    for i in range(wires):
        states.add(f'q{chr(i + 49)}')
        input_symbols.add(chr(i + 49))
    input_symbols.add('(')
    input_symbols.add(')')

    maze = DPDA(
        states=states,
        input_symbols=input_symbols,
        stack_symbols=stack_symbols,
        transitions=translate_transitions([
            [f'1-1', '/A'],
            [f'1-3', 'C/'],
            [f'1-4', 'B/'],
            [f'1-;', 'A/'],
            [f'1-?', 'B/'],
            [f'1-@', 'C/'],
            [f'2-4', '/A'],
            [f'3-5', '/A'],
            [f'3-7', '/B'],
            [f'3-7', 'A/'],  # Makes Path 1 error, Need to find a way around
            [f'3-9', 'B/'],
            [f'3-B', 'A/'],
            [f'4-5', 'B/'],
            [f'4-=', 'C/'],
            [f'6-7', 'C/'],
            [f'6-8', '/B'],
            [f'7->', 'C/'],
            [f'8-:', '/A'],
            [f'8-;', 'A/'],
            [f'8-<', 'C/'],
            [f'8->', 'C/'],
            [f'8-?', 'A/'],
            [f'8-A', 'C/'],
            [f'9-<', 'A/'],
            [f':-:', '/A'],
            [f':-=', 'B/'],
            [f':-@', 'B/']
        ], stack_symbols),
        initial_state=f'q{chr(18 + 48)}',
        initial_stack_symbol='',
        final_states={f'q{chr(17 + 48)}'},
        acceptance_mode='both'
    )
# JAM #1
elif maze == 3:
    # Pattern of Solution
    # N -> N+1
    # N, (, 1, [Solution to get to N - 1], N-1, ), [Solution to get from N - 1 to N without (],  N+1
    #
    # 3 -> 4
    # 3, (, 1, [(], 2, ), [1, )], 4
    shape_sides = 8

    wires = 9
    path = create_path(shape_sides + 1)
    # path = '(2(1)3(1(2)1)4(1(2(1)3)1(2)1)5(1(2(1)3(1(2)1)4)1(2(1)3)1(2)1)6(1(2(1)3(1(2)1)4(1(2(1)3)1(2)1)5)1(2(1)3(1(2)1)4)1(2(1)3)1(2)1)7'
    stack_symbols = {'A', 'B', 'C', 'D', 'E', 'F', '', 'G', 'H'}
    fake_states = {}

    states = set()
    input_symbols = set()
    for i in range(wires):
        states.add(f'q{chr(i + 49)}')
        input_symbols.add(chr(i + 49))
    input_symbols.add('(')
    input_symbols.add(')')

    maze = DPDA(
        states=states,
        input_symbols=input_symbols,
        stack_symbols=stack_symbols,
        transitions=translate_transitions([
            ['1-1', 'A/'],
            ['1-2', 'A/'],
            ['1-3', 'B/'],
            ['1-4', 'C/'],
            ['1-5', 'D/'],
            ['1-6', 'E/'],
            ['1-7', 'F/'],
            ['2-2', 'B/'],
            ['3-3', 'C/'],
            ['4-4', 'D/'],
            ['5-5', 'E/'],
            ['6-6', 'F/'],
            ['1-8', 'G/'],
            ['1-9', 'H/'],
            ['7-7', 'G/'],
            ['8-8', 'H/']
        ], stack_symbols),
        initial_state='q1',
        initial_stack_symbol='',
        final_states={f'q{shape_sides + 1}'},
        acceptance_mode='both'
    )
# Inner Frame
elif maze == 4:
    path = '4215)412'
    stack_symbols = {'A', ''}
    fake_states = {'q5'}
    wires = 5

    states = set()
    input_symbols = set()
    for i in range(wires):
        states.add(f'q{chr(i + 49)}')
        input_symbols.add(chr(i + 49))
    input_symbols.add('(')
    input_symbols.add(')')

    maze = DPDA(
        states=states,
        input_symbols=input_symbols,
        stack_symbols=stack_symbols,
        transitions=translate_transitions([
            ['1-2', 'A/'],
            ['1-3', '/A'],
            ['1-4', '/A'],
            # ['1-4', 'A/'], Fix 1
            ['1-5', 'A/'],  # Fix 1
            ['2-3', 'A/'],
            ['2-4', 'A/'],
            ['4-5', 'A/'],  # Fix 1
            ['5-5', 'A/']  # Fix 1
        ], stack_symbols),
        initial_state='q1',
        initial_stack_symbol='',
        final_states={'q2'},
        acceptance_mode='both'
    )

def main() -> None:
    print('Path Accepted') if maze.accepts_input(path) else print('Path Error')

    for maze_out in maze.read_input_stepwise(path):
        if maze_out[0] not in fake_states:
            print(f'Input: {maze_out[1] :<{len(path)}}, State: {maze_out[0][0]}{ord(maze_out[0][1::]) - 48:<2}, Stack: {maze_out[2][0][1::]}')
            # print(f'State: {maze_out[0][0]}{ord(maze_out[0][1::]) - 48:<2}, Stack: {maze_out[2][0][1::]}')
