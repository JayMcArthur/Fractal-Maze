document.addEventListener("DOMContentLoaded", function () {
    // Load maze data from a JSON file or an API
    // Example: Fetch maze data and populate the dropdown
    fetch('mazes.json')
        .then(response => response.json())
        .then(data => {
            const mazeList = document.getElementById('mazeList');
            data.mazes.forEach(maze => {
                const option = document.createElement('option');
                option.value = maze.name;
                option.text = maze.displayName;
                mazeList.appendChild(option);
            });
        });

    // Add event listener to load selected maze
    mazeList.addEventListener('change', function () {
        const selectedMaze = mazeList.value;
        loadMaze(selectedMaze);
    });

    // Maze loading function
    function loadMaze(mazeName) {
        // Implement loading and rendering the maze using Canvas or SVG
        // Replace this with your maze rendering logic
        const mazeCanvas = document.getElementById('mazeCanvas');
        mazeCanvas.innerHTML = `Loading ${mazeName}...`;
        // Replace this with your maze rendering logic

        // Update HUD
        const hud = document.getElementById('hud');
        hud.textContent = 'Position: 0';
    }

    // Reset button event listener
    const resetButton = document.getElementById('resetButton');
    resetButton.addEventListener('click', function () {
        // Implement reset logic
        // Replace this with your reset logic
        alert('Reset button clicked');
    });
});
