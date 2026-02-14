using Learnio.Data;
using Learnio.Dtos;
using Learnio.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Learnio.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CoursesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CoursesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // 1. СОЗДАТЬ КУРС
        [HttpPost]
        public async Task<IActionResult> CreateCourse([FromBody] CreateCourseDto model)
        {
            if (string.IsNullOrEmpty(model.TeacherId))
            {
                return BadRequest("TeacherId is required!");
            }

            var teacher = await _context.Users.FindAsync(model.TeacherId);
            if (teacher == null)
            {
                return NotFound("Teacher user not found in DB");
            }

            var course = new Course
            {
                Id = Guid.NewGuid(),
                Name = model.Name,
                Description = model.Description,
                CreatedAt = DateTime.UtcNow,
                TeacherId = model.TeacherId,
                JoinCode = GenerateRandomCode(),
                IsArchived = false // За замовчуванням курс активний
            };

            _context.Courses.Add(course);
            await _context.SaveChangesAsync();

            return Ok(course);
        }

        // 2. ПОЛУЧИТЬ КУРСЫ (С ФИЛЬТРАЦИЕЙ И ПОИСКОМ)
        // GET: api/Courses?userId=...&filter=...&search=...
        [HttpGet]
        public async Task<IActionResult> GetCourses(
            [FromQuery] string userId,
            [FromQuery] string? filter = "all",
            [FromQuery] string? search = "")
        {
            if (string.IsNullOrEmpty(userId)) return BadRequest("UserId is required");

            // 1. Початковий запит (підтягуємо вчителя і студентів, щоб перевірити участь)
            var query = _context.Courses
                .Include(c => c.Teacher)
                .Include(c => c.Enrollments)
                .AsQueryable();

            // 2. ПОШУК (Search)
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.ToLower().Trim();
                query = query.Where(c => c.Name.ToLower().Contains(search) ||
                                         (c.Description != null && c.Description.ToLower().Contains(search)));
            }

            // 3. ФІЛЬТРАЦІЯ (Filter)
            switch (filter?.ToLower())
            {
                case "teaching":
                    // Тільки де я вчитель І курс НЕ в архіві
                    query = query.Where(c => c.TeacherId == userId && !c.IsArchived);
                    break;

                case "enrolled":
                    // Тільки де я студент І курс НЕ в архіві
                    query = query.Where(c => c.Enrollments.Any(e => e.StudentId == userId) && !c.IsArchived);
                    break;

                case "archived":
                case "completed": // На всяк випадок обидва варіанти
                    // Тільки АРХІВНІ курси (байдуже, вчитель я там чи студент)
                    query = query.Where(c => (c.TeacherId == userId || c.Enrollments.Any(e => e.StudentId == userId)) && c.IsArchived);
                    break;

                case "all":
                default:
                    // Всі АКТИВНІ курси (де я вчитель АБО студент)
                    query = query.Where(c => (c.TeacherId == userId || c.Enrollments.Any(e => e.StudentId == userId)) && !c.IsArchived);
                    break;
            }

            // 4. Сортування: Спочатку нові
            query = query.OrderByDescending(c => c.CreatedAt);

            // 5. Вибірка даних (важливо повернути IsArchived, щоб фронт знав)
            var courses = await query
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.TeacherId,
                    c.JoinCode,
                    c.IsArchived, // <--- Важливо
                    TeacherName = c.Teacher == null ? "Unknown" : c.Teacher.FirstName + " " + c.Teacher.LastName
                })
                .ToListAsync();

            return Ok(courses);
        }

        // 3. АРХІВУВАТИ КУРС
        // PUT: api/Courses/{id}/archive
        [HttpPut("{id}/archive")]
        public async Task<IActionResult> ArchiveCourse(Guid id)
        {
            var course = await _context.Courses.FindAsync(id);
            if (course == null) return NotFound("Course not found");

            // Тільки вчитель може архівувати (у майбутньому можна додати перевірку)
            course.IsArchived = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Course archived successfully" });
        }

        // GET: api/Courses/{id}
        // Це для course-details.js - отримати один конкретний курс
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCourse(Guid id)
        {
            var course = await _context.Courses
                .Include(c => c.Teacher)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (course == null) return NotFound();

            return Ok(new
            {
                course.Id,
                course.Name,
                course.Description,
                course.TeacherId,
                course.JoinCode,
                course.IsArchived, // Повертаємо статус
                TeacherName = course.Teacher == null ? "Unknown" : course.Teacher.FirstName + " " + course.Teacher.LastName
            });
        }

        // 4. РАЗАРХИВИРОВАТЬ КУРС (RESTORE)
        // PUT: api/Courses/{id}/unarchive
        [HttpPut("{id}/unarchive")]
        public async Task<IActionResult> UnarchiveCourse(Guid id)
        {
            var course = await _context.Courses.FindAsync(id);
            if (course == null) return NotFound("Course not found");

            // Повертаємо курс до життя
            course.IsArchived = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Course restored successfully" });
        }

        // Вспомогательный метод для генерации кода
        private string GenerateRandomCode()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 6)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
    }
}