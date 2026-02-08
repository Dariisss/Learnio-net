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

        // 1. СОЗДАТЬ КУРС (Правильный метод)
        [HttpPost]
        public async Task<IActionResult> CreateCourse([FromBody] CreateCourseDto model)
        {
            // Проверка: прислали ли нам ID учителя?
            if (string.IsNullOrEmpty(model.TeacherId))
            {
                return BadRequest("TeacherId is required!");
            }

            // Проверка: существует ли такой учитель в базе?
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

                // ВАЖНО: Берем ID именно из модели (от сайта), а не первого попавшегося
                TeacherId = model.TeacherId,

                // Генерируем код (6 символов)
                JoinCode = GenerateRandomCode()
            };

            _context.Courses.Add(course);
            await _context.SaveChangesAsync();

            return Ok(course);
        }

        // 2. ПОЛУЧИТЬ КУРСЫ (С ФИЛЬТРАЦИЕЙ)
        // GET: api/Courses?userId=...
        [HttpGet]
        public async Task<IActionResult> GetCourses([FromQuery] string? userId)
        {
            // Начинаем запрос к базе
            var query = _context.Courses
                .Include(c => c.Teacher)
                .AsQueryable();

            // Если передали ID пользователя - включаем фильтр
            if (!string.IsNullOrEmpty(userId))
            {
                query = query.Where(c =>
                    c.TeacherId == userId || // 1. Я - Учитель этого курса
                    c.Enrollments.Any(e => e.StudentId == userId) // 2. ИЛИ Я - Студент (есть запись в Enrollments)
                );
            }

            // Превращаем данные в красивый вид для сайта
            var courses = await query
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.TeacherId,
                    c.JoinCode,
                    TeacherName = c.Teacher == null ? "Unknown" : c.Teacher.FirstName + " " + c.Teacher.LastName
                })
                .ToListAsync();

            return Ok(courses);
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