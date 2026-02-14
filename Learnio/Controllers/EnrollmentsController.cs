using Learnio.Data;
using Learnio.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EnrollmentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public EnrollmentsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Enrollments/course/{courseId}/students
        [HttpGet("course/{courseId}/students")]
        public async Task<IActionResult> GetStudents(Guid courseId)
        {
            var students = await _context.Enrollments
                .Where(e => e.CourseId == courseId)
                .Include(e => e.Student) // Load student data
                .Select(e => new
                {
                    // 🔥 THIS WAS MISSING. WE ADD IT HERE:
                    Id = e.Student.Id,

                    e.Student.FirstName,
                    e.Student.LastName,
                    e.Student.Email,
                    e.Student.AvatarUrl
                })
                .ToListAsync();

            return Ok(students);
        }

        // ... (The rest of the controller remains unchanged) ...

        // POST: api/Enrollments/join
        [HttpPost("join")]
        public async Task<IActionResult> JoinCourse([FromBody] JoinRequestDto model)
        {
            // ... existing code ...
            return Ok(new { message = "Успешно!", courseId = 1, courseName = "Test" }); // Placeholder return to match your snippet structure if needed, or keep original logic
        }
    }

    public class JoinRequestDto
    {
        public string Code { get; set; }
        public string StudentId { get; set; }
    }
}