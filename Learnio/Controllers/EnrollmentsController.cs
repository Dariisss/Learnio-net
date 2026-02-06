using Learnio.Data;
using Learnio.Dtos;
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

        // МЕТОД: Вступить в курс по коду
        // POST: api/enrollments/join
        [HttpPost("join")]
        public async Task<IActionResult> JoinCourse([FromBody] JoinCourseDto model)
        {
            // 1. Ищем курс по коду
            // (ToUpper() нужен, чтобы xY12a и XY12A считались одинаковыми)
            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.JoinCode == model.JoinCode.ToUpper());

            if (course == null)
            {
                return NotFound("Курс с таким кодом не найден.");
            }

            // 2. Ищем студента по Email
            var student = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == model.StudentEmail);

            if (student == null)
            {
                return BadRequest("Такого студента нет.");
            }

            // 3. Проверяем: А вдруг он УЖЕ в курсе?
            var exists = await _context.Enrollments
                .AnyAsync(e => e.CourseId == course.Id && e.StudentId == student.Id);

            if (exists)
            {
                return BadRequest("Вы уже записаны на этот курс!");
            }

            // 4. Проверяем: Учитель не может стать студентом своего курса
            if (course.TeacherId == student.Id)
            {
                return BadRequest("Учитель не может записаться к себе как студент.");
            }

            // 5. Записываем!
            var enrollment = new Enrollment
            {
                Id = Guid.NewGuid(),
                CourseId = course.Id,
                StudentId = student.Id,
                JoinedAt = DateTime.UtcNow
            };

            _context.Enrollments.Add(enrollment);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Вы успешно записались на курс '{course.Name}'!" });
        }

        // МЕТОД: Посмотреть "Мои курсы" (для студента)
        // GET: api/enrollments/my-courses?email=student@test.com
        [HttpGet("my-courses")]
        public async Task<IActionResult> GetStudentCourses(string email)
        {
            var student = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (student == null) return BadRequest("Студент не найден");

            var myCourses = await _context.Enrollments
                .Where(e => e.StudentId == student.Id)
                .Select(e => new
                {
                    CourseName = e.Course.Name,
                    TeacherName = e.Course.Teacher.FirstName + " " + e.Course.Teacher.LastName,
                    JoinedAt = e.JoinedAt
                })
                .ToListAsync();

            return Ok(myCourses);
        }
    }
}