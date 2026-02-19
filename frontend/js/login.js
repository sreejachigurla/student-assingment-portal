const form = document.getElementById("loginForm");
const messageDiv = document.getElementById("message");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://localhost:5000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.innerHTML = `<span style="color:green">${data.message}</span>`;
            // Save studentId in localStorage for dashboard use
           localStorage.setItem("student", JSON.stringify(data.student));

            setTimeout(() => { window.location.href = "student.html"; }, 1000);
        } else {
            messageDiv.innerHTML = `<span style="color:red">${data.message}</span>`;
        }
    } catch (err) {
        console.log(err);
        messageDiv.innerHTML = `<span style="color:red">Server error</span>`;
    }
});
console.log(data);

