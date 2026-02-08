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
                .Include(e => e.Student) // Подтягиваем данные студента
                .Select(e => new
                {
                    e.Student.FirstName,
                    e.Student.LastName,
                    e.Student.Email,
                    e.Student.AvatarUrl
                })
                .ToListAsync();

            return Ok(students);
        }

        // POST: api/Enrollments/join
        [HttpPost("join")]
        public async Task<IActionResult> JoinCourse([FromBody] JoinRequestDto model)
        {
            // 1. Ищем курс по Коду (JoinCode)
            // Важно: в базе код может быть "05489D", а введут "05489d" - делаем ToUpper()
            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.JoinCode == model.Code.ToUpper());

            if (course == null)
            {
                return NotFound("Курс с таким кодом не найден.");
            }

            // 2. Проверяем, не записан ли уже студент
            var exists = await _context.Enrollments
                .AnyAsync(e => e.CourseId == course.Id && e.StudentId == model.StudentId);

            if (exists)
            {
                return BadRequest("Вы уже записаны на этот курс!");
            }

            // 3. Создаем запись
            var enrollment = new Enrollment
            {
                Id = Guid.NewGuid(),
                CourseId = course.Id,
                StudentId = model.StudentId,
                JoinedAt = DateTime.UtcNow
            };

            _context.Enrollments.Add(enrollment);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Успешно!", courseId = course.Id, courseName = course.Name });
        }
    }

    // DTO класс прямо тут для удобства
    public class JoinRequestDto
    {
        public string Code { get; set; }
        public string StudentId { get; set; }
    }
}