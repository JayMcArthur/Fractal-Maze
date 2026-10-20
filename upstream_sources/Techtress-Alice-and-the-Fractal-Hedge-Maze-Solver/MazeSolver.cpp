#include <iostream>
#include <sstream>
#include <vector>
#include <map>
#include <unordered_set>
#include <chrono>
#include <thread>

using namespace std;

const int BASE_NODES = 12;
const int A = BASE_NODES;
const int B = A + BASE_NODES;
const int C = B + BASE_NODES;
const int D = C + BASE_NODES;
const int TOTAL_NODES = D + BASE_NODES;

const char FLOOR_LABELS[] = { 'G', 'A', 'B', 'C', 'D' };

// Hash table = faster than binary tree in this case
unordered_set<int> connections[TOTAL_NODES];

int iterations;
bool solution;
bool onlybest;
int max_moves;
int max_floors;
int best_moves;
int best_floors;

void connect(int A, int B)
{
    // Automatic two-way connection for simplicity's sake
    connections[A].insert(B);
    connections[B].insert(A);
}

bool is_connected(int A, int B)
{
    return connections[A].count(B);
}

bool has_node(int section, int node)
{
    // If this section (A, B, C, D) has any number of connections in this offset
    // location, it has a node.
    return connections[section + node].size();
}

char letterize(int floor)
{
    return FLOOR_LABELS[floor / BASE_NODES];
}

void find_goal(int next_node, vector<int> floors, int most_floors, vector<pair<int, int> > path)
{
    if (solution && onlybest) return;
    iterations++;

    int gate = next_node;

    if (next_node < BASE_NODES) {
        gate += floors.back();
        floors.pop_back();
    }
    else {
        floors.push_back((next_node / BASE_NODES) * BASE_NODES);
        gate -= floors.back();
        if (most_floors < floors.size())
            most_floors = floors.size();
    }

    path.push_back(make_pair(floors.size(), next_node));

    if (most_floors > max_floors || path.size() > max_moves
        || (path.size() > best_moves&& best_moves > -1)
        || (best_moves > -1 && path.size() >= best_moves && most_floors > best_floors))
        return;
    
    // If we have reached the top layer...
    if (floors.back() == 0) {

        solution = true;

        if (best_moves == -1 || path.size() < best_moves) best_moves = path.size();
        if (best_floors == -1 || most_floors < best_floors) best_floors = most_floors;

        cout << "Solution found in " << path.size() << " moves, going " << most_floors - 1 << " floors deep" << endl;

        for (auto i : path) {
            if (i.second >= A) cout << letterize(i.second);
            cout << (i.second % BASE_NODES) + 1 << " ";
        }
        cout << endl << endl;

        return;
    }

    // Try EVERYTHING
    for (int i : connections[gate]) {

        // Only go up if there is a way to go up, meaning
        // if there is a path leading out in the current
        // lettered room (i.e., there's no 2 exit for A,
        // but there is a 9)
        if (i < BASE_NODES) {
            if (has_node(floors.back(), i)) {
                find_goal(i, floors, most_floors, path);
            }
        }

        // If we are going down, enter the appropriate lettered room
        // from the appropriate door (all contained in the 'i' variable)
        else find_goal(i, floors, most_floors, path);
    }
}

void wait_enter(const string& message)
{
    cin.ignore(std::numeric_limits <std::streamsize> ::max(), '\n');
    cout << endl << message;
    cin.ignore(std::numeric_limits <std::streamsize> ::max(), '\n');
}

int main()
{
    // Since arrays start at 0, we must artificially deflate the maze (1=0, 10=9, etc...)
    // The sections are represented as positions in the array of nodes. This means that
    // some "nodes" will not be able to be used, but being in a contiguous array allows
    // for faster access.

    // Connect outside nodes to both outside and inside nodes
    connect(0, 11);     connect(0, A + 4);
    connect(0, A + 11);
    connect(1, 9);      connect(1, 7); 
    connect(1, A + 8);  connect(1, C + 3);
    connect(2, B);      connect(2, B + 3);
    connect(3, B + 4);  connect(3, B + 5);
    connect(4, D + 3);  connect(4, D + 4);
    connect(5, D + 7);
    connect(6, B + 6);  connect(6, D + 9);
    connect(7, 9);      connect(7, A + 8);
    connect(7, C + 3);
    connect(8, C + 6);  connect(8, C + 10);
    connect(9, A + 8);  connect(9, C + 3);
    connect(10, A + 9);
    connect(11, A + 4); connect(11, A + 11);

    // Connect inside nodes to other inside nodes
    connect(A + 4, A + 11); connect(A + 8, C + 3);
    connect(B, B + 3);      connect(B + 4, B + 5);
    connect(B + 6, D + 9);  connect(B + 7, D + 0);
    connect(B + 7, D + 2);  connect(B + 10, B + 11);
    connect(C + 1, C + 11); connect(C + 6, C + 10);
    connect(D + 0, D + 2);  connect(D + 3, D + 4);
    connect(D + 10, D + 11);

    bool completed = true;
    string in;

    do {
        iterations = 0;
        solution = false;
        onlybest = false;
        max_moves = 2;
        max_floors = 1;
        best_moves = -1;
        best_floors = -1;

        cout << "\n"
            << " //=======================================================// \n"
            << " //--  Welcome to the Dead Man Walking Maze Solver 2.0  --// \n"
            << " //--        Where you die by walking too much          --// \n"
            << " //=======================================================// " << endl;

        cout << "\nPlease choose whether you want to:\n"
                " 1. Solve the puzzle yourself\n";

        if (completed)
            cout << " 2. Have this tool find a host of solutions (w/tons of useless backtracking, ending with the best)\n" <<
                    " 3. Just go straight to the optimal solution...\n";
        else
            cout << " 2. (LOCKED UNTIL COMPLETION)\n"
                    " 3. (LOCKED UNTIL COMPLETION)\n";

        cout << " 4. Exit\n" << endl;

        cin >> in;

        stringstream instream(in);
        int input;
        instream >> input;

        vector<pair<int, int> > path;
        vector<int> floors({ 0 });

        int virus = 0;

        if (in == "1") {

            vector<int> options;
            options.push_back(A + 2);

            in = "1";
            int gate;

            int moves = 0;

            do {
                moves++;

                instream.clear();
                instream.str(in);
                instream >> input;

                cout << endl;

                if (input >= options.size() + 1 || input < 1) {

                    if (virus == 0) {
                        cout << " *** Please enter a VALID OPTION ***" << endl << endl;
                    }
                    else if (virus == 1) {
                        cout << " *** Stop doing that! ***" << endl << endl;
                    }
                    else if (virus == 2) {
                        cout << " *** OKAY, DO THAT 1 MORE TIME! ***" << endl << endl;
                    }
                    if (virus == 3) {
                        cout << "Sending a virus to your computer VVVRRNRNNNNNNNNNNNNNN";

                        this_thread::sleep_for(chrono::milliseconds(200));

                        for (int i = 0; i < 3; i++) {
                            cout << ".";
                            this_thread::sleep_for(chrono::milliseconds(1000));
                        }

                        while (true) {
                            cout << (char)(rand() % 256);
                        }
                        return 0;
                    }

                    options.clear();
                    virus++;
                }
                else {
                    virus = 0;
                    int next_node = options[input - 1];
                    options.clear();

                    // Give up...
                    if (next_node == -2) {
                        cout << "Loser..." << endl;
                        break;
                    }

                    // Undo
                    if (next_node == -1) {
                        if (path.back().second < BASE_NODES)
                            floors.push_back((path[path.size() - 2].second / BASE_NODES) * BASE_NODES);
                        else
                            floors.pop_back();
                        path.pop_back();
                        next_node = path.back().second;

                        if (path.back().second < BASE_NODES)
                            floors.push_back((path[path.size() - 2].second / BASE_NODES) * BASE_NODES);
                        else
                            floors.pop_back();
                        path.pop_back();
                    }

                    //
                    // Prepare next selection...
                    //

                    gate = next_node;

                    if (next_node < BASE_NODES) {
                        gate += floors.back();
                        floors.pop_back();
                    }
                    else {
                        floors.push_back((next_node / BASE_NODES) * BASE_NODES);
                        gate -= floors.back();
                    }

                    path.push_back(make_pair(floors.size(), next_node));

                    cout << " ----------------------------------------------------------- " << endl << endl;
                    cout << "You are currently on floor " << floors.size() - 1 << " (" << letterize(floors.back()) << ")" << endl << endl;
                }

                if (floors.back() == 0) {
                    cout << "Congratulations!! It only took you " << moves << " moves! (including start to A3, which we did for you...)" << endl;
                    completed = true;
                    break;
                }

                bool up = false, down = false;

                // We have to loop through the nodes twice since the
                // connections are an unordered_set. We can't guarantee
                // that all the 1st ones will be connecting to paths
                // leading up, so we must filter them out per-iteration

                // Search available options going up
                for (int i : connections[gate]) {
                    if (i < BASE_NODES) {
                        if (has_node(floors.back(), i)) {
                            if (!up) {
                                cout << "Go up to floor " << floors.size() - 2 << " (" << letterize(floors[floors.size() - 2]) << ")" << ": " << endl;
                                up = true;
                            }
                            options.push_back(i);
                            cout << " " << options.size() << ". " << i + 1 << endl;
                        }
                    }
                }

                // Search available options going down
                for (int i : connections[gate]) {
                    if (i >= BASE_NODES) {
                        if (!down) {
                            if (up) cout << endl;
                            cout << "Go down to floor " << floors.size() << ": " << endl;
                            down = true;
                        }
                        options.push_back(i);
                        cout << " " << options.size() << ". " << letterize((i / BASE_NODES) * BASE_NODES) << "-" << (i % BASE_NODES) + 1 << endl;
                    }
                }

                // Provide undo option if we are not still at start
                if (path.size() > 1) {
                    options.push_back(-1);
                    cout << endl << options.size() << ". Go back to floor " << path[path.size() - 2].first - 1 << " (" << letterize(floors[path[path.size() - 2].first - 1]) << ")" << endl;
                }

                // And of course allow the option to give up
                options.push_back(-2);
                cout << endl << options.size() << ". Give Up" << endl;

                cout << endl;
            } while (cin >> in);
        }

        // Brute-force a list of solutions from worst to best
        else if (in == "2" && completed) {
            cout << endl << "For sanity's sake, please enter a reasonable floor limit (including the first 'A3'): " << endl;
            cin >> max_floors;
            cout << "Also max moves: " << endl;
            cin >> max_moves;
            cout << endl;

            max_floors++;

            find_goal(A + 2, floors, 0, path);

            cout << "Hello World\n\nThis was completed in " << iterations << " iterations" << endl;
        }

        // Brute-force an optimal solution
        else if (in == "3" && completed) {

            onlybest = true;

            cout << endl;

            bool inc_floors = true;

            while (!solution) {
                find_goal(A + 2, floors, 0, path);

                if (inc_floors) {
                    // Steadily increase the max number of floors to traverse in case we 
                    // hit dead ends.
                    max_floors++;

                    // We know for certain the "perfect" solution has to have twice as many moves as floors
                    // because you have to go down and then back up. Of course, we know that the puzzle is
                    // more complex than that, but I want to keep the format flexible for that type of
                    // phenomenon in case this is applied to a similar puzzle with different doorways.
                    if (max_floors >= max_moves/2)
                        inc_floors = false;
                }
                else {
                    // Each time we increase the number of possible moves, we must go back and
                    // check for each floor capacity, to ensure the optimal solution is found first
                    // (not 100% necessary, because we could keep a record of all solutions and
                    //  only print the best one, but I'm lazy)
                    max_moves++;
                    max_floors = 1;
                    inc_floors = true;
                }
            }
            cout << "Hello World\n\nThis was completed in " << iterations << " iterations" << endl;
        }

        // Exit from main menu
        else if (in == "4") {
            return 0;
        }

        // Trying to access locked content...
        else if ((in == "2" || in == "3") && !completed) {
            cout << "No can do, smartass" << endl;

            wait_enter("Press ENTER to exit...");
            return 0;
        }

        // User entered something dumb at the main menu
        else {
            cout << " *** Please enter a VALID INPUT ***" << endl;
        }

        // Restart the program once we have completed everything
        wait_enter("Press ENTER to continue...");
        continue;

    } while (true);

    return 0;
}
